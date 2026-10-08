export const SOURCES = [
  "Reddit",
  "X / Twitter",
  "Instagram",
  "TikTok",
  "YouTube",
  "Telegram",
  "Discord",
  "Search / SEO",
  "Direct traffic",
  "Referral websites",
  "Creator referrals",
  "Peer swaps",
  "Email",
  "Paid campaigns",
  "Custom campaign links",
  "Other",
];
export const PROVIDERS = [
  "Subscription platform",
  "OnlyFans",
  "Fansly",
  "Patreon",
  "Pornhub",
  "Website",
  "Google Analytics",
  "Search Console",
  "Instagram",
  "X / Twitter",
  "TikTok",
  "Reddit",
  "Telegram",
  "Discord",
  "YouTube",
  "Email platform",
  "Custom analytics source",
];
export const SWAP_TYPES = [
  "Story Swap",
  "Feed/Post Swap",
  "Link Swap",
  "Shoutout for Shoutout",
  "Bundle Promotion",
  "Scheduled Promotion",
  "Custom Collaboration",
];
export function aggregate(
  events,
  conversions,
  { from, to, model = "last-touch" } = {},
) {
  const inRange = (e) =>
    (!from || e.timestamp >= from) && (!to || e.timestamp <= to);
  const es = events.filter(inRange),
    cs = conversions.filter((c) => inRange({ timestamp: c.timestamp }));
  const visits = es.filter((e) =>
    ["page_view", "landing_view"].includes(e.type),
  );
  const clicks = es.filter((e) =>
    ["tracked_click", "subscription_click"].includes(e.type),
  );
  const attributed = cs.filter((c) => c.verified && c.tracked_link_id);
  const sourceOf = (c) =>
    model === "first-touch" ? c.first_source_id || c.source_id : c.source_id;
  const keys = [
    ...new Set([
      ...es.map((e) => e.source_id || "Direct traffic"),
      ...attributed.map(sourceOf),
    ]),
  ];
  const rows = keys
    .map((source) => {
      const sourceEvents = es.filter(
        (e) => (e.source_id || "Direct traffic") === source,
      );
      const sourceClicks = sourceEvents.filter((e) =>
        ["tracked_click", "subscription_click"].includes(e.type),
      );
      const visitors = new Set(sourceEvents.map((e) => e.session_id)).size;
      const subs = attributed.filter((c) => sourceOf(c) === source);
      const revenue = subs.reduce((sum, c) => sum + c.revenue, 0);
      return {
        source,
        traffic: sourceEvents.filter((e) =>
          ["tracked_click", "page_view", "landing_view"].includes(e.type),
        ).length,
        visitors,
        clicks: sourceClicks.length,
        subscribers: subs.length,
        conversionRate: visitors ? (subs.length / visitors) * 100 : 0,
        revenue,
        rpv: visitors ? revenue / visitors : 0,
      };
    })
    .sort((a, b) => b.visitors - a.visitors);
  const unique = new Set(es.map((e) => e.session_id)).size;
  const growth = Array.from({ length: 14 }, (_, i) => {
    const end = to ? new Date(to) : new Date();
    end.setUTCDate(end.getUTCDate() - 13 + i);
    const date = end.toISOString().slice(0, 10);
    return {
      date,
      visitors: new Set(
        es.filter((e) => e.timestamp.startsWith(date)).map((e) => e.session_id),
      ).size,
      conversions: attributed.filter((c) => c.timestamp.startsWith(date))
        .length,
    };
  });
  return {
    visits: visits.length,
    clicks: clicks.length,
    visitors: unique,
    traffic: es.filter((e) =>
      ["tracked_click", "page_view", "landing_view"].includes(e.type),
    ).length,
    conversions: attributed.length,
    unverified: cs.filter((c) => !c.verified).length,
    revenue: attributed.reduce((sum, c) => sum + c.revenue, 0),
    conversionRate: unique ? (attributed.length / unique) * 100 : 0,
    peerSubscribers: attributed.filter((c) => c.peer_id).length,
    rows,
    growth,
  };
}
// Providers are registered independently of the attribution engine. No fabricated OAuth or metrics.
export function createAdapter(provider) {
  const supported = ["OnlyFans", "Fansly", "Pornhub"].includes(provider);
  return {
    connect: async () => ({
      status:
        provider === "Subscription platform" || supported
          ? "url_only"
          : "unavailable",
      message:
        provider === "Subscription platform" || supported
          ? "Destination saved. No verified official subscriber-sync API is configured. Counts are creator-reported only."
          : "Official API integration is not configured.",
    }),
    disconnect: async () => ({ status: "disconnected" }),
    sync: async () => ({
      status: "unavailable",
      message:
        "Official API credentials and provider implementation are required.",
    }),
    getMetrics: async () => null,
    getCampaignMetrics: async () => null,
    getProfile: async () => null,
    getStatus: async () => ({ status: "unavailable" }),
  };
}
