import React, { useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  revision: number;
  status: string;
  budget_cents: number;
  daily_cap_cents: number;
  simulated_cents: number;
};
type Proposal = {
  summary: string;
  recommendations: string[];
  copy: string[];
  risks: string[];
};
type AdminData = {
  controls: { paused: boolean; reason: string };
  campaign_details: Campaign[];
  audit: { id: number; action: string; created_at: string }[];
};
type Api = (path: string, method?: string, body?: unknown) => Promise<any>;

export default function FounderControls({ api }: { api: Api }) {
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [proposal, setProposal] = useState<Proposal | null>(null);
  const refresh = async () => setData(await api("/admin"));
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Founder controls">
      <h3>Founder controls</h3>
      <p>
        Real spending is disabled. Campaign approval records your chosen budget
        for review and dry runs.
      </p>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {data && (
        <>
          <p role="status">
            Planning is {data.controls.paused ? "paused" : "enabled"}.{" "}
            {data.controls.reason}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              act(() =>
                api("/controls/pause", "POST", {
                  reason: "Founder emergency pause",
                }),
              )
            }
          >
            Emergency pause
          </button>{" "}
          <button
            className="button"
            disabled={busy || !data.controls.paused}
            onClick={() => act(() => api("/controls/resume", "POST", {}))}
          >
            Resume planning
          </button>
          <h3>Campaign approval</h3>
          {data.campaign_details.length === 0 && (
            <p>Create a campaign from Campaigns to review it here.</p>
          )}
          {data.campaign_details.map((c) => (
            <form
              key={c.id}
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(() =>
                  api(`/campaigns/${c.id}/approve`, "POST", {
                    revision: c.revision,
                    budget_cents: Math.round(Number(f.get("budget")) * 100),
                    daily_cap_cents: Math.round(Number(f.get("daily")) * 100),
                  }),
                );
              }}
            >
              <h4>{c.name}</h4>
              <p>
                Revision {c.revision} · {c.status} · Simulated $
                {(c.simulated_cents / 100).toFixed(2)}
              </p>
              <label>
                Campaign budget (USD){" "}
                <input
                  name="budget"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={c.budget_cents / 100 || ""}
                />
              </label>{" "}
              <label>
                Daily cap (USD, UTC){" "}
                <input
                  name="daily"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={c.daily_cap_cents / 100 || ""}
                />
              </label>{" "}
              <button
                className="button"
                disabled={busy || data.controls.paused}
              >
                Approve revision {c.revision} and budget
              </button>
            </form>
          ))}
          <h3>OpenAI agents</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(async () => {
                const r = await api("/agents/run", "POST", {
                  agent: f.get("agent"),
                  brief: f.get("brief"),
                });
                setProposal(r.proposal);
              });
            }}
          >
            <label>
              Agent{" "}
              <select name="agent">
                <option value="planner">Campaign planner</option>
                <option value="copywriter">Copywriter</option>
                <option value="analyst">Analyst</option>
              </select>
            </label>
            <label>
              Brief <textarea name="brief" maxLength={4000} required />
            </label>
            <button className="button" disabled={busy || data.controls.paused}>
              Generate proposal
            </button>
          </form>
          {proposal && (
            <div className="panel">
              <p>{proposal.summary}</p>
              {(["recommendations", "copy", "risks"] as const).map((k) => (
                <div key={k}>
                  <h4>{k}</h4>
                  <ul>
                    {proposal[k].map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <h3>Audit log</h3>
          <ul>
            {data.audit.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString()} · {a.action}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
