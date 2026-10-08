import React from "react";
import {
  ArrowRight,
  Flame,
  Rocket,
  RefreshCw,
  Link,
  Activity,
  MousePointer2,
  Users,
  DollarSign,
  Filter,
  Check,
  Plus,
  Globe,
  ShieldCheck,
  Megaphone,
} from "lucide-react";
import {
  SiReddit,
  SiX,
  SiTiktok,
  SiInstagram,
  SiYoutube,
  SiOnlyfans,
  SiPatreon,
} from "react-icons/si";
const number = (v: number) => Number(v || 0).toLocaleString();
const dollars = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v || 0);
const channels = [
  ["Reddit", "Community traffic", SiReddit, "#ff4500"],
  ["X / Twitter", "Posts & conversations", SiX, "#f6f6f6"],
  ["TikTok", "Short-form video", SiTiktok, "#25f4ee"],
  ["Instagram", "Reels & stories", SiInstagram, "#e64ac5"],
  ["YouTube", "Video & discovery", SiYoutube, "#ff172b"],
  ["Creator referrals", "Creator connections", Users, "#20c9ef"],
  ["OnlyFans", "Creator destination", SiOnlyfans, "#00aeef"],
  ["Fansly", "Creator destination", ShieldCheck, "#16bafa"],
  ["Patreon", "Memberships", SiPatreon, "#ff5961"],
  ["Pornhub", "Creator destination", Globe, "#ffa31a"],
] as const;
export const campaignPresets = [
  ["Social launch", "Reddit", "/examples/model-square.png"],
  ["Story promotion", "Instagram", "/examples/model-story.png"],
  ["Video campaign", "TikTok", "/examples/model-landscape.png"],
  ["Member spotlight", "Email", "/examples/model-square.png"],
  ["Pure Swap", "Peer swaps", "/examples/model-story.png"],
];
export default function Dashboard({
  state,
  subscribers,
  navigate,
  create,
  selectSource,
  openCampaign,
  GrowthChart,
  openPeer,
  openActivity,
  openTemplates,
}: any) {
  const m = state.metrics;
  const current = subscribers.value == null ? "—" : number(subscribers.value);
  const steps = [
    [
      "Set up campaign",
      "Choose a source, destination, and goal",
      "campaigns",
      state.campaigns.length > 0,
    ],
    [
      "Share your tracking link",
      "Use it in a post, bio, or promotion",
      "links",
      m.clicks > 0,
    ],
    [
      "Find a growth partner",
      "Discover creators and propose a swap",
      "peer-swap",
      state.swaps.length > 0,
    ],
    [
      "Measure your results",
      "Review traffic and report conversions",
      "analytics",
      m.conversions > 0,
    ],
  ];
  const nextStep = steps.findIndex((step) => !step[3]);
  return (
    <div className="official-dashboard">
      <section className="np-hero" aria-label="Creator growth dashboard">
        <img
          className="np-hero-art"
          src="/examples/model-landscape.png"
          alt="Naughty Pilot creator campaign artwork"
        />
        <div className="np-hero-copy">
          <h2>
            GROW YOUR
            <br />
            <em>FANS FASTER</em>
          </h2>
          <p>
            Promote <b>·</b> Swap <b>·</b> Track <b>·</b> Grow
          </p>
          <div className="np-benefits">
            <span>
              <Check />
              Top Traffic Sources
            </span>
            <span>
              <Filter />
              Multi-Platform
            </span>
            <span>
              <Check />
              Pure Swap Network
            </span>
            <span>
              <Check />
              Real Analytics
            </span>
          </div>
          <button className="button primary" onClick={() => create()}>
            Start New Campaign <ArrowRight size={18} />
          </button>
        </div>
        <div className="np-hero-total metric">
          <div className="metric-label">Current subscribers</div>
          <strong>{current}</strong>
          <small>
            {subscribers.value == null
              ? "Connect a platform in Account"
              : subscribers.evidence === "official_api"
                ? `${subscribers.stale ? "Last synced" : "Synced"} from Patreon`
                : "Creator-reported total"}
          </small>
          <div className="np-mini-growth" aria-label="Recorded visitor counts">
            {m.growth.slice(-14).map((v: any, i: number) => (
              <span
                key={i}
                title={`${v.date}: ${v.visitors} visitors`}
                style={{
                  height: `${Math.max(3, (100 * v.visitors) / Math.max(1, ...m.growth.map((x: any) => x.visitors)))}%`,
                }}
              />
            ))}
          </div>
          <small className="np-trend-caption">Recorded visitor trend</small>
        </div>
      </section>
      <div className="np-kpis">
        {[
          [
            "Total Clicks",
            number(m.clicks),
            "Recorded campaign clicks",
            MousePointer2,
          ],
          [
            "Conversions",
            number(m.conversions),
            "Attributed creator reports",
            Filter,
          ],
          [
            "New Fans",
            number(m.conversions),
            "Creator-reported subscribers",
            Users,
          ],
          [
            "Revenue",
            dollars(m.revenue),
            "Attributed creator reports · USD",
            DollarSign,
          ],
        ].map(([label, value, detail, Icon]: any) => (
          <div className="np-kpi metric" key={label}>
            <span className="np-kpi-icon">
              <Icon size={24} />
            </span>
            <div>
              <div className="metric-label">{label}</div>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="np-dashboard-grid">
        <div className="np-column np-wide-column">
          <section className="panel np-sources">
            <div className="panel-heading">
              <h2>
                <Flame />
                Top Traffic Sources
              </h2>
              <button
                className="button small-button"
                onClick={() => navigate("traffic")}
              >
                View All
              </button>
            </div>
            <div className="np-channel-grid">
              {channels.map(([name, detail, Icon, color]) => (
                <button
                  className="np-channel"
                  key={name}
                  onClick={() =>
                    ["OnlyFans", "Fansly", "Patreon", "Pornhub"].includes(name)
                      ? navigate("account")
                      : selectSource(name)
                  }
                >
                  <span style={{ color }}>
                    <Icon size={30} />
                  </span>
                  <strong>{name === "X / Twitter" ? "Twitter/X" : name}</strong>
                  <small>{detail}</small>
                </button>
              ))}
            </div>
            {m.visitors === 0 && (
              <p className="np-empty-caption">
                No traffic recorded yet. Share a tracked link to see which
                sources work.
              </p>
            )}
          </section>
          <section className="panel np-links">
            <div className="panel-heading">
              <h2>
                <Link />
                Link Analytics
              </h2>
              <button
                className="button small-button"
                onClick={() => navigate("links")}
              >
                View All
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Link / campaign</th>
                    <th>Clicks</th>
                    <th>Conversions</th>
                    <th>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {state.links.slice(0, 5).map((link: any) => (
                    <tr key={link.id}>
                      <td>
                        <button
                          className="np-link-name"
                          onClick={() => {
                            const campaign = state.campaigns.find(
                              (c: any) => c.id === link.campaign_id,
                            );
                            if (campaign) openCampaign(campaign);
                          }}
                        >
                          <span className="np-table-icon">
                            <Link size={16} />
                          </span>
                          <span>
                            {link.name}
                            <small>
                              {link.source} · {link.status}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>{number(link.click_count)}</td>
                      <td>{number(link.conversion_count)}</td>
                      <td className={link.revenue ? "np-positive" : ""}>
                        {dollars(link.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!state.links.length && (
              <p className="np-empty-caption">
                Create a campaign to generate your first tracked link.
              </p>
            )}
            <p className="np-table-footnote">
              Conversions and earnings are creator-reported. No subscriber
              identities are shared.
            </p>
          </section>
        </div>
        <div className="np-column">
          <section className="panel np-plan">
            <div className="panel-heading">
              <h2>
                <Rocket />
                Growth Plan
              </h2>
              <small>
                {nextStep === -1
                  ? "All steps complete"
                  : `Step ${nextStep + 1} of 4`}
              </small>
            </div>
            <ol>
              {steps.map(([title, detail, route, complete], i) => (
                <li key={String(title)}>
                  <button
                    className={`np-step ${complete ? "complete" : ""}`}
                    onClick={() => navigate(route)}
                  >
                    <span className="np-step-number">
                      {complete ? <Check size={16} /> : i + 1}
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <button className="button primary full" onClick={() => create()}>
              Start New Campaign <ArrowRight size={17} />
            </button>
          </section>
          <section className="panel np-templates">
            <div className="panel-heading">
              <h2>
                <Megaphone />
                Campaign Templates
              </h2>
              <button className="button small-button" onClick={openTemplates}>
                View All
              </button>
            </div>
            <p className="np-template-hint">
              Choose a starting point. Customize before launching.
            </p>
            <div className="np-template-grid">
              {campaignPresets.map(([name, source, image], i) => (
                <button
                  key={name}
                  onClick={() =>
                    name === "Pure Swap"
                      ? navigate("peer-swap")
                      : create({ name, source })
                  }
                >
                  <img
                    src={image}
                    alt=""
                    style={{ objectPosition: `${50 + i * 6}% center` }}
                  />
                  <strong>{name}</strong>
                  <small>{source}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="np-column np-side-column">
          <section className="panel np-swaps">
            <div className="panel-heading">
              <h2>
                <RefreshCw />
                Pure Swap Network
              </h2>
            </div>
            <p>
              Connect with compatible creators.
              <br />
              <span>Grow together through cross-promotion.</span>
            </p>
            <div className="np-partners">
              {state.peers.slice(0, 4).map((peer: any) => (
                <button
                  key={peer.id}
                  title={peer.display_name}
                  aria-label={`Explore ${peer.display_name}`}
                  onClick={() => openPeer(peer)}
                >
                  {peer.display_name
                    .split(" ")
                    .map((v: string) => v[0])
                    .slice(0, 2)
                    .join("")}
                </button>
              ))}
              <button
                aria-label="Find swap partners"
                onClick={() => navigate("peer-swap")}
              >
                <Plus />
              </button>
            </div>
            <small>
              {state.peers.length
                ? `${state.peers.length} opted-in creators available`
                : "Opt into discovery in Account to find partners."}
            </small>
            <button
              className="button primary full"
              onClick={() => navigate("peer-swap")}
            >
              Find Swap Partners <ArrowRight size={17} />
            </button>
          </section>
          <section className="panel np-activity">
            <div className="panel-heading">
              <h2>
                <Activity />
                Recent Activity
              </h2>
              <button className="button small-button" onClick={openActivity}>
                See All
              </button>
            </div>
            {state.notifications.slice(0, 6).map((n: any) => (
              <div className="np-activity-row" key={n.id}>
                <span>
                  <Activity size={18} />
                </span>
                <p>
                  {n.message}
                  <small>{new Date(n.created_at).toLocaleDateString()}</small>
                </p>
              </div>
            ))}
            {!state.notifications.length && (
              <p className="np-empty-caption">
                Your campaign and collaboration updates will appear here.
              </p>
            )}
          </section>
        </div>
      </div>
      <section className="panel np-recorded-growth">
        <div className="panel-heading">
          <h2>
            <Activity />
            Your Recorded Growth
          </h2>
          <small>Unique visitors · last 14 days</small>
        </div>
        {m.visitors ? (
          <GrowthChart data={m.growth} />
        ) : (
          <p className="np-empty-caption">
            Use your tracked links to start measuring real traffic.
          </p>
        )}
      </section>
      <div className="np-supporting-metrics">
        {[
          [
            "Traffic generated",
            number(m.traffic),
            `${number(m.visitors)} unique visitors`,
          ],
          ["Profile / page visits", number(m.visits), "Recorded website views"],
          [
            "Conversion rate",
            `${Number(m.conversionRate || 0).toFixed(1)}%`,
            "Conversions / unique visitors",
          ],
        ].map(([label, value, detail]) => (
          <div className="metric" key={label}>
            <div className="metric-label">{label}</div>
            <strong>{value}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
