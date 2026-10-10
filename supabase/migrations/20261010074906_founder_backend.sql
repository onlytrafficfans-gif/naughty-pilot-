-- Dedicated founder backend. All Data API tables are private to server service_role.
begin;
create table public.np_founder (
  singleton boolean primary key default true check (singleton),
  user_id uuid unique not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.np_controls (
  singleton boolean primary key default true check (singleton),
  paused boolean not null default true,
  real_spending_enabled boolean not null default false check (not real_spending_enabled),
  reason text not null default 'Founder setup: planning paused; real spending disabled',
  epoch bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.np_controls(singleton) values (true);
create table public.np_records (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id),
  kind text not null check (kind in ('profile','content','template','schedule','account','website','notification','report')),
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (id, creator_id)
);
create index np_records_owner_kind on public.np_records(creator_id,kind);
create unique index np_one_profile on public.np_records(creator_id) where kind='profile';
create table public.np_campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id),
  data jsonb not null,
  revision integer not null default 1,
  status text not null default 'draft' check(status in ('draft','approved','paused')),
  budget_cents integer not null default 0 check(budget_cents between 0 and 100000000),
  daily_cap_cents integer not null default 0 check(daily_cap_cents between 0 and budget_cents),
  approved_revision integer,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  simulated_cents integer not null default 0 check(simulated_cents >= 0),
  created_at timestamptz not null default now()
);
create table public.np_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id),
  campaign_id uuid not null references public.np_campaigns(id),
  slug text unique not null default replace(gen_random_uuid()::text,'-',''),
  destination text not null,
  source text not null,
  status text not null default 'active' check(status in ('active','paused')),
  created_at timestamptz not null default now()
);
create table public.np_events (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id),
  campaign_id uuid references public.np_campaigns(id), tracked_link_id uuid references public.np_links(id),
  session_id uuid not null, type text not null check(type in ('tracked_click','page_view','landing_view','cta_click','subscription_click','custom_event')),
  source_id text, timestamp timestamptz not null default now(), data jsonb not null default '{}'
);
create index np_events_owner_time on public.np_events(creator_id,timestamp);
create table public.np_conversions (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id),
  external_id text not null, campaign_id uuid references public.np_campaigns(id),
  tracked_link_id uuid references public.np_links(id), session_id uuid,
  source_id text, first_source_id text, first_link_id uuid references public.np_links(id), first_campaign_id uuid references public.np_campaigns(id),
  revenue numeric(12,2) not null check(revenue >= 0),
  verified boolean not null default false, evidence text not null,
  timestamp timestamptz not null default now(), unique(creator_id,external_id)
);
create index np_conversions_owner_time on public.np_conversions(creator_id,timestamp);
create table public.np_audit (
  id bigint generated always as identity primary key, actor_id uuid,
  action text not null, entity_id text, details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.np_agent_runs (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id),
  agent text not null check(agent in ('planner','copywriter','analyst')),
  status text not null default 'running' check(status in ('running','completed','failed','cancelled')),
  epoch bigint not null, result jsonb, created_at timestamptz not null default now()
);
create table public.np_simulations (
  request_id uuid primary key, campaign_id uuid not null references public.np_campaigns(id),
  creator_id uuid not null references auth.users(id), amount_cents integer not null check(amount_cents > 0),
  created_at timestamptz not null default now()
);
create index np_simulations_campaign_time on public.np_simulations(campaign_id,created_at);
create table public.np_rate_limits (
  key text primary key, count integer not null, window_start timestamptz not null
);
create table public.np_revoked_tokens (
  digest text primary key,
  expires_at timestamptz not null
);

-- Audit every mutation without copying secrets, briefs, profile data or tokens into logs.
create function public.np_audit_change() returns trigger language plpgsql
set search_path = '' as $$
declare row_data jsonb; actor uuid;
begin
  if TG_OP='DELETE' then row_data:=to_jsonb(OLD); else row_data:=to_jsonb(NEW); end if;
  actor:=coalesce((row_data->>'creator_id')::uuid, (select user_id from public.np_founder where singleton));
  insert into public.np_audit(actor_id,action,entity_id,details)
    values(actor, TG_TABLE_NAME||'.'||lower(TG_OP), row_data->>'id',
      jsonb_strip_nulls(jsonb_build_object('status',row_data->>'status','revision',row_data->>'revision',
        'budget_cents',row_data->>'budget_cents','daily_cap_cents',row_data->>'daily_cap_cents',
        'paused',row_data->>'paused','epoch',row_data->>'epoch','amount_cents',row_data->>'amount_cents')));
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['np_founder','np_controls','np_records','np_campaigns','np_links','np_conversions','np_agent_runs','np_simulations'] loop
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.np_audit_change()',t);
  end loop;
  foreach t in array array['np_founder','np_controls','np_records','np_campaigns','np_links','np_events','np_conversions','np_audit','np_agent_runs','np_simulations','np_rate_limits','np_revoked_tokens'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
end $$;
revoke update, delete, truncate on public.np_audit from service_role;
grant usage,select on sequence public.np_audit_id_seq to service_role;
revoke all on function public.np_audit_change() from public,anon,authenticated;

create function public.np_assert_founder(p_actor uuid) returns void language plpgsql
set search_path='' as $$ begin
  if not exists(select 1 from public.np_founder where singleton and user_id=p_actor) then
    raise exception 'FOUNDER_REQUIRED';
  end if;
end $$;

create function public.np_create_campaign(p_actor uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$ declare c public.np_campaigns; l public.np_links;
begin
  perform public.np_assert_founder(p_actor);
  insert into public.np_campaigns(creator_id,data) values(p_actor,p_data) returning * into c;
  insert into public.np_links(creator_id,campaign_id,destination,source)
    values(p_actor,c.id,p_data->>'destination',p_data->>'source') returning * into l;
  return to_jsonb(c)||jsonb_build_object('link_id',l.id);
end $$;

create function public.np_approve_campaign(p_actor uuid,p_id uuid,p_revision integer,p_budget integer,p_daily integer)
returns jsonb language plpgsql set search_path='' as $$
declare c public.np_campaigns; paused_now boolean;
begin
  perform public.np_assert_founder(p_actor);
  select paused into paused_now from public.np_controls where singleton for update;
  if paused_now then raise exception 'PAUSED'; end if;
  select * into c from public.np_campaigns where id=p_id and creator_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.revision<>p_revision then raise exception 'STALE_REVISION'; end if;
  if p_budget is null or p_daily is null or p_budget<=0 or p_budget>100000000 or p_daily<=0 or p_daily>p_budget or p_budget<c.simulated_cents then
    raise exception 'INVALID_BUDGET'; end if;
  update public.np_campaigns set budget_cents=p_budget,daily_cap_cents=p_daily,approved_revision=revision,
    approved_by=p_actor,approved_at=now(),status='approved' where id=p_id returning * into c;
  return to_jsonb(c);
end $$;

create function public.np_edit_campaign(p_actor uuid,p_id uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$ declare c public.np_campaigns;
begin
  perform public.np_assert_founder(p_actor);
  -- Use the same lock order as pause, approval and simulation.
  perform 1 from public.np_controls where singleton for update;
  update public.np_campaigns set data=p_data,revision=revision+1,status='draft',approved_revision=null,
    approved_by=null,approved_at=null where id=p_id and creator_id=p_actor returning * into c;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.np_links set destination=p_data->>'destination',source=p_data->>'source' where campaign_id=p_id;
  return to_jsonb(c);
end $$;

create function public.np_pause(p_actor uuid,p_paused boolean,p_reason text) returns jsonb
language plpgsql set search_path='' as $$ declare c public.np_controls;
begin
  perform public.np_assert_founder(p_actor);
  update public.np_controls set paused=p_paused,reason=left(p_reason,500),epoch=epoch+1,updated_at=now()
    where singleton returning * into c;
  if p_paused then
    update public.np_campaigns set status='paused',approved_revision=null,approved_by=null,approved_at=null;
    update public.np_agent_runs set status='cancelled',result=null where status='running';
  end if;
  return to_jsonb(c);
end $$;

create function public.np_simulate(p_actor uuid,p_id uuid,p_amount integer,p_request uuid)
returns jsonb language plpgsql set search_path='' as $$
declare c public.np_campaigns; previous public.np_simulations; today_total bigint; paused_now boolean;
begin
  perform public.np_assert_founder(p_actor);
  select paused into paused_now from public.np_controls where singleton for update;
  if paused_now then raise exception 'PAUSED'; end if;
  select * into c from public.np_campaigns where id=p_id and creator_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_amount is null or p_amount<=0 or p_request is null then raise exception 'INVALID_AMOUNT'; end if;
  select * into previous from public.np_simulations where request_id=p_request;
  if found then
    if previous.campaign_id<>p_id or previous.creator_id<>p_actor or previous.amount_cents<>p_amount then
      raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('simulation',to_jsonb(previous),'replayed',true,'real_spending_enabled',false);
  end if;
  if c.status<>'approved' or c.approved_revision is distinct from c.revision then raise exception 'APPROVAL_REQUIRED'; end if;
  select coalesce(sum(amount_cents),0) into today_total from public.np_simulations
    where campaign_id=p_id and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if c.simulated_cents::bigint+p_amount>c.budget_cents or today_total+p_amount>c.daily_cap_cents then raise exception 'CAP_EXCEEDED'; end if;
  insert into public.np_simulations(request_id,campaign_id,creator_id,amount_cents)
    values(p_request,p_id,p_actor,p_amount) returning * into previous;
  update public.np_campaigns set simulated_cents=simulated_cents+p_amount where id=p_id;
  return jsonb_build_object('simulation',to_jsonb(previous),'replayed',false,'real_spending_enabled',false);
end $$;

create function public.np_limit(p_key text,p_max integer,p_seconds integer) returns boolean
language plpgsql set search_path='' as $$ declare n integer;
begin
  delete from public.np_rate_limits where window_start<now()-interval '2 days';
  insert into public.np_rate_limits(key,count,window_start) values(p_key,1,now())
  on conflict(key) do update set
    count=case when np_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else np_rate_limits.count+1 end,
    window_start=case when np_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else np_rate_limits.window_start end
  returning count into n;
  return n<=p_max;
end $$;

-- RPCs are server-only and execute with the caller's privileges, never SECURITY DEFINER.
revoke all on function public.np_assert_founder(uuid),public.np_create_campaign(uuid,jsonb),
  public.np_approve_campaign(uuid,uuid,integer,integer,integer),public.np_edit_campaign(uuid,uuid,jsonb),
  public.np_pause(uuid,boolean,text),public.np_simulate(uuid,uuid,integer,uuid),public.np_limit(text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.np_assert_founder(uuid),public.np_create_campaign(uuid,jsonb),
  public.np_approve_campaign(uuid,uuid,integer,integer,integer),public.np_edit_campaign(uuid,uuid,jsonb),
  public.np_pause(uuid,boolean,text),public.np_simulate(uuid,uuid,integer,uuid),public.np_limit(text,integer,integer)
  to service_role;
create function public.np_start_agent(p_actor uuid,p_agent text) returns jsonb
language plpgsql set search_path='' as $$ declare c public.np_controls; r public.np_agent_runs;
begin
  perform public.np_assert_founder(p_actor);
  select * into c from public.np_controls where singleton for update;
  if c.paused then raise exception 'PAUSED'; end if;
  if not public.np_limit('agent:'||p_actor::text,20,86400) then raise exception 'RATE_LIMITED'; end if;
  insert into public.np_agent_runs(creator_id,agent,epoch) values(p_actor,p_agent,c.epoch) returning * into r;
  return to_jsonb(r);
end $$;
create function public.np_finish_agent(p_actor uuid,p_id uuid,p_result jsonb,p_failed boolean)
returns jsonb language plpgsql set search_path='' as $$
declare c public.np_controls; r public.np_agent_runs;
begin
  perform public.np_assert_founder(p_actor);
  select * into c from public.np_controls where singleton for update;
  select * into r from public.np_agent_runs where id=p_id and creator_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.status<>'running' or c.paused or c.epoch<>r.epoch then
    update public.np_agent_runs set status='cancelled',result=null where id=p_id returning * into r;
  else
    update public.np_agent_runs set status=case when p_failed then 'failed' else 'completed' end,
      result=case when p_failed then null else p_result end where id=p_id returning * into r;
  end if;
  return to_jsonb(r);
end $$;
revoke all on function public.np_start_agent(uuid,text),public.np_finish_agent(uuid,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.np_start_agent(uuid,text),public.np_finish_agent(uuid,uuid,jsonb,boolean) to service_role;
commit;
