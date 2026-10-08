import React, { useState } from "react";
import {
  Plus,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  X,
  Calendar,
} from "lucide-react";
import { campaignPresets } from "./Dashboard";
export default function WorkspaceScreen({
  kind,
  state,
  api,
  perform,
  create,
  navigate,
  busy,
}: any) {
  const [editing, setEditing] = useState<any>(null);
  const [query, setQuery] = useState("");
  const items = (state.workspace?.[kind] || []).filter((v: any) =>
    (v.title + " " + v.caption).toLowerCase().includes(query.toLowerCase()),
  );
  const names: any = {
    content: ["content reference", "Content Library"],
    template: ["template", "Campaign Templates"],
    schedule: ["promotion reminder", "Promotion Schedule"],
  };
  const save = async (e: any) => {
    e.preventDefault();
    const b: any = Object.fromEntries(new FormData(e.currentTarget));
    if (kind === "schedule") b.due_at = new Date(b.due_at).toISOString();
    await perform(
      async () => {
        await api(
          `/workspace/${kind}${editing.id ? "/" + editing.id : ""}`,
          editing.id ? "PUT" : "POST",
          b,
        );
        setEditing(null);
      },
      "Saved",
      false,
    );
  };
  return (
    <div className="np-workspace" key={kind}>
      {kind === "schedule" && (
        <div className="info">
          <Calendar size={20} />
          <p>
            Plan your promotions and review reminders here. Due reminders appear
            in notifications when you open the app. This does not automatically
            post to external platforms.
          </p>
        </div>
      )}
      {kind === "content" && (
        <p className="np-workspace-note">
          Organize your own public content URLs, campaign captions, and sources.
          Files stay on your chosen hosting service.
        </p>
      )}
      {kind === "template" && (
        <section className="panel np-preset-screen">
          <h2>Campaign starting points</h2>
          <div className="np-template-picker">
            {campaignPresets.map(([name, source, image]) => (
              <button
                key={name}
                onClick={() =>
                  name === "Pure Swap"
                    ? navigate("peer-swap")
                    : create({ name, source })
                }
              >
                <img src={image} alt="" />
                <span>
                  <strong>{name}</strong>
                  <small>{source} · editable campaign preset</small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="np-workspace-toolbar">
        <input
          aria-label={`Search ${names[kind][1]}`}
          placeholder="Search your saved items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="button primary" onClick={() => setEditing({})}>
          <Plus size={17} />
          Add {names[kind][0]}
        </button>
      </div>
      {editing && (
        <section className="panel np-workspace-editor">
          <div className="panel-heading">
            <h2>
              {editing.id ? "Edit" : "Add"} {names[kind][0]}
            </h2>
            <button
              className="icon-button"
              aria-label="Cancel editing"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
          </div>
          <form onSubmit={save}>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={100}
                defaultValue={editing.title || ""}
              />
            </label>
            <label>
              Traffic source
              <select name="source" defaultValue={editing.source || "Reddit"}>
                {state.sources.map((source: string) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            {kind !== "schedule" && (
              <label>
                {kind === "content"
                  ? "Public content URL"
                  : "Destination URL (optional)"}
                <input
                  name="url"
                  type="url"
                  required={kind === "content"}
                  defaultValue={editing.url || ""}
                />
              </label>
            )}
            {kind === "schedule" && (
              <>
                <label>
                  Due date and time
                  <input
                    name="due_at"
                    type="datetime-local"
                    required
                    defaultValue={
                      editing.due_at
                        ? new Date(
                            new Date(editing.due_at).getTime() -
                              new Date(editing.due_at).getTimezoneOffset() *
                                60000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                  />
                </label>
                <label>
                  Campaign
                  <select
                    name="campaign_id"
                    defaultValue={editing.campaign_id || ""}
                  >
                    <option value="">No campaign</option>
                    {state.campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    defaultValue={editing.status || "pending"}
                  >
                    <option>pending</option>
                    <option>completed</option>
                    <option>cancelled</option>
                  </select>
                </label>
              </>
            )}
            <label>
              {kind === "schedule" ? "Notes" : "Caption / notes"}
              <textarea
                name="caption"
                rows={4}
                maxLength={2000}
                defaultValue={editing.caption || ""}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Save {names[kind][0]}
            </button>
          </form>
        </section>
      )}
      <div className="np-workspace-cards">
        {items.map((item: any) => (
          <article className="panel" key={item.id}>
            <h2>{item.title}</h2>
            <small>
              {item.source}
              {item.status ? " · " + item.status : ""}
            </small>
            {item.caption && <p>{item.caption}</p>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                Open content / destination <ArrowRight size={13} />
              </a>
            )}
            {item.due_at && <p>{new Date(item.due_at).toLocaleString()}</p>}
            <div className="np-detail-actions">
              <button className="button" onClick={() => setEditing(item)}>
                <Pencil size={15} />
                Edit
              </button>
              <button
                className="button"
                onClick={() =>
                  perform(
                    () => api(`/workspace/${kind}/${item.id}`, "DELETE"),
                    "Removed",
                    false,
                  )
                }
              >
                <Trash2 size={15} />
                Remove
              </button>
              {kind === "schedule" ? (
                <button
                  className="button"
                  disabled={busy || item.status === "completed"}
                  onClick={() =>
                    perform(
                      () =>
                        api(`/workspace/${kind}/${item.id}`, "PUT", {
                          ...item,
                          status: "completed",
                        }),
                      "Marked complete",
                      false,
                    )
                  }
                >
                  <Check size={15} />
                  Complete
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() =>
                    create({
                      name: item.title,
                      source: item.source,
                      destination: kind === "template" ? item.url : undefined,
                      content_id: kind === "content" ? item.id : undefined,
                    })
                  }
                >
                  Use in campaign
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!items.length && !editing && (
        <section className="panel np-workspace-empty">
          <h2>
            {query ? "No matching items" : `No saved ${names[kind][0]}s yet`}
          </h2>
          <p>
            {query
              ? "Try another search."
              : `Add a ${names[kind][0]} to organize your next promotion.`}
          </p>
        </section>
      )}
    </div>
  );
}
