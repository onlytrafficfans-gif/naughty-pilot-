// Centralized, deterministic campaign forecast engine.
// Single source of truth for all forecast math — no hardcoded results, no RNG.
// Same inputs always produce the same output.

export interface CampaignAssumptions {
  totalBudget: number;        // dollars
  subscriptionPrice: number;  // dollars per paid conversion
  targetSubscribers: number;  // user goal (informational; not used in math)
  durationDays: number;       // informational
  refundRatePct: number;      // 0–100, refund/cancellation rate
  confidencePct: number;      // 0–100, informational label for the range
  audience: string;
  country: string;
  minAge: number;             // enforced >= 18 by the UI
  objective: string;
}

export interface TrafficSourceAssumption {
  id: string;
  name: string;
  enabled: boolean;
  allocationPct: number;      // 0–100 share of total budget
  cpc: number;                // dollars per click
  clickToLandingPct: number;  // 0–100 click → landing-page rate
  landingToPaidPct: number;   // 0–100 landing → paid rate
  uncertaintyPct: number;     // 0–100 ± band on this source's conversions
  minSpend?: number;          // optional floor
  notes?: string;
}

export interface TrafficSourceForecast {
  id: string;
  name: string;
  spend: number;
  clicks: number;
  landingVisits: number;
  grossConversions: number;
  netConversions: number;
  revenue: number;
  lowConversions: number;
  highConversions: number;
}

export interface CampaignForecast {
  perSource: TrafficSourceForecast[];
  totalSpend: number;
  totalClicks: number;
  totalLandingVisits: number;
  totalGrossConversions: number;
  totalNetConversions: number;   // == modeled midpoint (before rounding)
  totalRevenue: number;
  midpoint: number;              // rounded net conversions
  low: number;                   // rounded
  high: number;                  // rounded
  visitToPaidPct: number;        // 0–100
  roas: number;                  // revenue / budget
  cac: number;                   // budget / net conversions
  breakEvenConversions: number;  // budget / price
  allocationTotalPct: number;    // sum of enabled allocations
  allocationValid: boolean;      // within 0.5% of 100
}

// Returns a finite, non-negative number, or the fallback (default 0).
function safe(n: number, fallback = 0): number {
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const pct = (n: number) => safe(n) / 100;

export function forecastSource(
  src: TrafficSourceAssumption,
  a: CampaignAssumptions,
): TrafficSourceForecast {
  const budget = safe(a.totalBudget);
  const price = safe(a.subscriptionPrice);
  const refund = Math.min(pct(a.refundRatePct), 1);

  const spend = budget * pct(src.allocationPct);
  const cpc = safe(src.cpc);
  const clicks = cpc > 0 ? spend / cpc : 0;                 // guard div-by-zero
  const landingVisits = clicks * pct(src.clickToLandingPct);
  const grossConversions = landingVisits * pct(src.landingToPaidPct);
  const netConversions = grossConversions * (1 - refund);
  const revenue = netConversions * price;
  const u = Math.min(pct(src.uncertaintyPct), 1);

  return {
    id: src.id,
    name: src.name,
    spend: safe(spend),
    clicks: safe(clicks),
    landingVisits: safe(landingVisits),
    grossConversions: safe(grossConversions),
    netConversions: safe(netConversions),
    revenue: safe(revenue),
    lowConversions: safe(netConversions * (1 - u)),
    highConversions: safe(netConversions * (1 + u)),
  };
}

export function computeForecast(
  assumptions: CampaignAssumptions,
  sources: TrafficSourceAssumption[],
): CampaignForecast {
  const enabled = sources.filter((s) => s.enabled);
  const perSource = enabled.map((s) => forecastSource(s, assumptions));

  const sum = (fn: (f: TrafficSourceForecast) => number) =>
    perSource.reduce((acc, f) => acc + fn(f), 0);

  const totalSpend = sum((f) => f.spend);
  const totalClicks = sum((f) => f.clicks);
  const totalLandingVisits = sum((f) => f.landingVisits);
  const totalGrossConversions = sum((f) => f.grossConversions);
  const totalNetConversions = sum((f) => f.netConversions);
  const totalRevenue = sum((f) => f.revenue);
  const low = sum((f) => f.lowConversions);
  const high = sum((f) => f.highConversions);

  const budget = safe(assumptions.totalBudget);
  const price = safe(assumptions.subscriptionPrice);

  const allocationTotalPct = enabled.reduce((acc, s) => acc + safe(s.allocationPct), 0);

  return {
    perSource,
    totalSpend,
    totalClicks,
    totalLandingVisits,
    totalGrossConversions,
    totalNetConversions,
    totalRevenue,
    midpoint: Math.round(totalNetConversions),
    low: Math.round(low),
    high: Math.round(high),
    visitToPaidPct: totalLandingVisits > 0 ? (totalNetConversions / totalLandingVisits) * 100 : 0,
    roas: budget > 0 ? totalRevenue / budget : 0,
    cac: totalNetConversions > 0 ? budget / totalNetConversions : 0,
    breakEvenConversions: price > 0 ? budget / price : 0,
    allocationTotalPct,
    allocationValid: Math.abs(allocationTotalPct - 100) < 0.5,
  };
}

// Proportionally scale enabled sources so their allocations total 100%.
// Explicit action only — never call this silently on input change.
export function normalizeAllocations(
  sources: TrafficSourceAssumption[],
): TrafficSourceAssumption[] {
  const enabled = sources.filter((s) => s.enabled);
  const total = enabled.reduce((acc, s) => acc + safe(s.allocationPct), 0);
  if (total <= 0) {
    // Nothing to scale — distribute evenly across enabled sources.
    const even = enabled.length ? 100 / enabled.length : 0;
    return sources.map((s) => (s.enabled ? { ...s, allocationPct: even } : s));
  }
  return sources.map((s) =>
    s.enabled ? { ...s, allocationPct: (safe(s.allocationPct) / total) * 100 } : s,
  );
}

export const DEFAULT_ASSUMPTIONS: CampaignAssumptions = {
  totalBudget: 300,
  subscriptionPrice: 19.99,
  targetSubscribers: 240,
  durationDays: 7,
  refundRatePct: 8,
  confidencePct: 80,
  audience: 'All adult audiences',
  country: 'United States',
  minAge: 21,
  objective: 'Subscriber growth',
};

// Research-informed starting assumptions per source. Editable by the user;
// nothing here is a "result" — these are inputs the forecast is computed from.
export const DEFAULT_SOURCES: TrafficSourceAssumption[] = [
  { id: 'trafficjunky', name: 'TrafficJunky', enabled: true,  allocationPct: 24, cpc: 0.10, clickToLandingPct: 55, landingToPaidPct: 4.0, uncertaintyPct: 30, minSpend: 20, notes: 'Tube inventory · keyword + geo' },
  { id: 'exoclick',     name: 'ExoClick',     enabled: true,  allocationPct: 20, cpc: 0.08, clickToLandingPct: 50, landingToPaidPct: 3.5, uncertaintyPct: 32, minSpend: 20, notes: 'Native + display · source rules' },
  { id: 'juicyads',     name: 'JuicyAds',     enabled: true,  allocationPct: 14, cpc: 0.09, clickToLandingPct: 48, landingToPaidPct: 3.2, uncertaintyPct: 34, minSpend: 10, notes: 'Native + banner · device targeting' },
  { id: 'reddit',       name: 'Reddit',       enabled: true,  allocationPct: 12, cpc: 0.06, clickToLandingPct: 45, landingToPaidPct: 3.0, uncertaintyPct: 38, notes: 'Community-led discovery' },
  { id: 'xsocial',      name: 'X / Social',   enabled: true,  allocationPct: 11, cpc: 0.05, clickToLandingPct: 42, landingToPaidPct: 2.8, uncertaintyPct: 40, notes: 'Preview-safe social funnel' },
  { id: 'creatorswaps', name: 'Creator swaps', enabled: true, allocationPct: 11, cpc: 0.07, clickToLandingPct: 52, landingToPaidPct: 4.2, uncertaintyPct: 36, notes: 'Audience-aligned shoutouts' },
  { id: 'seoclips',     name: 'SEO / Clips',  enabled: true,  allocationPct: 8,  cpc: 0.04, clickToLandingPct: 40, landingToPaidPct: 3.6, uncertaintyPct: 42, notes: 'Compounding discovery' },
];
