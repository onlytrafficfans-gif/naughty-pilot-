import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Megaphone,
  Users,
  Link as LinkIcon,
  BarChart3,
  UserRound,
  ChevronDown,
  Plus,
  Check,
  X,
  Copy,
  QrCode,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Bell,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Globe,
  LogOut,
  ShieldCheck,
  Radio,
  MousePointer2,
  TrendingUp,
  Zap,
  Download,
  MoreHorizontal,
  RefreshCw,
  Menu,
  LockKeyhole,
  Compass,
  Send,
  Calendar,
  CircleHelp,
  Plane,
  Loader2,
} from "lucide-react";
import QRCode from "qrcode";
import "./styles.css";
import Dashboard, { campaignPresets } from "./Dashboard";
import WorkspaceScreen from "./WorkspaceScreen";
import FounderControls from "./FounderControls";
import { Settings } from "lucide-react";
const founderBuild = import.meta.env.VITE_FOUNDER_MODE === "true";
const NAV = [
  ["Home", Home, "home"],
  ["Traffic", Activity, "traffic"],
  ["Campaigns", Megaphone, "campaigns"],
  ["Peer Swap", Users, "peer-swap"],
  ["Links", LinkIcon, "links"],
  ["Analytics", BarChart3, "analytics"],
  ["Account", UserRound, "account"],
  ["Automation", RefreshCw, "automation"],
  ["Templates", Copy, "templates"],
  ["Content Library", Megaphone, "content-library"],
  ["Subscriptions", Users, "subscriptions"],
  ["Settings", Settings, "settings"],
] as const;
const num = (n: any) => Number(n || 0).toLocaleString();
const money = (n: any) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
const pct = (n: any) => `${Number(n || 0).toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name: string) =>
  name
    ?.split(" ")
    .map((v) => v[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "NP";
async function api(path: string, method = "GET", body?: any) {
  const r = await fetch("/api/cockpit" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(data.error || "Something went wrong."), {
      status: r.status,
    });
  return data;
}
function Brand() {
  return (
    <a className="brand" href="/home" aria-label="Naughty Pilot home">
      <img src="/naughty-pilot-logo.png" alt="NP" />
      <span className="np-brand-name">
        NAUGHTY
        <br />
        <b>PILOT</b>
      </span>
    </a>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: any;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  icon: Icon = Compass,
  title,
  description,
  action,
}: {
  icon?: any;
  title: string;
  description: string;
  action?: any;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: any;
  hint?: string;
}) {
  const fieldId = React.useId();
  const control =
    React.isValidElement(children) &&
    ["input", "select", "textarea"].includes(String(children.type));
  return (
    <div className="field">
      {control ? (
        <label htmlFor={fieldId}>{label}</label>
      ) : (
        <span>{label}</span>
      )}
      {control
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: fieldId,
            "aria-describedby": hint ? fieldId + "-hint" : undefined,
          })
        : children}
      {hint && <small id={fieldId + "-hint"}>{hint}</small>}
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon: Icon = TrendingUp,
}: {
  label: string;
  value: any;
  detail: string;
  icon?: any;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <Icon size={15} />
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
function Legal({ kind }: { kind: string }) {
  return (
    <div className="legal-copy">
      <h3>{kind === "terms" ? "Terms of service" : "Privacy & consent"}</h3>
      {kind === "terms" ? (
        <>
          <p>
            Naughty Pilot is for creators aged 18 or older. You must own or have
            permission to promote every destination and asset you use.
          </p>
          <p>
            Promotions require mutual consent. Spam, impersonation, abusive
            activity, fake engagement, non-consensual content, and bypassing
            platform restrictions are prohibited. Follow the rules of every
            platform you use.
          </p>
          <p>
            Attribution is based on recorded first-party traffic and
            creator-provided conversion reports. It is not a guarantee of
            earnings or proof of platform subscriber counts. Block or report
            abusive creators through Peer Swap.
          </p>
          <p>
            This self-hosted release provides no subscription billing or
            commercial service commitment. Production operators must supply
            their legal entity, support details, applicable terms, and retention
            policy before public launch.
          </p>
        </>
      ) : (
        <>
          <p>
            We store your account email, password hash, profile, campaign data,
            anonymous session identifiers, and first-party tracking events. We
            do not record subscriber names or payment credentials.
          </p>
          <p>
            Website tracking runs only when your website sets{" "}
            <code>window.NP_TRACKING_CONSENT = true</code>. Do Not Track is
            respected. Obtain visitors’ consent where required. Country is not
            inferred or invented.
          </p>
          <p>
            You choose whether your profile and region appear in discovery.
            Partners see aggregate collaboration results, never subscriber
            identities. Export or delete your data in Account.
          </p>
          <p>
            The database stays on this server. The operator is responsible for
            secure backups, retention, consent notices, and lawful deployment.
          </p>
        </>
      )}
    </div>
  );
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: any;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("input,button,select")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,a[href]",
          ) || []),
        ].filter((el) => !el.hasAttribute("disabled"));
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Auth({
  onSuccess,
  founderOnly = false,
}: {
  onSuccess: () => void;
  founderOnly?: boolean;
}) {
  const [register, setRegister] = useState(!founderOnly),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [adult, setAdult] = useState(false),
    [terms, setTerms] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [legal, setLegal] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/" + (register ? "register" : "login"), "POST", {
        email,
        password,
        adult,
        terms,
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <Badge tone="accent">
            <span className="status-dot" /> Your creator growth cockpit
          </Badge>
          <h1>
            Know where your
            <br />
            <em>growth comes from.</em>
          </h1>
          <p>
            One clear view of your traffic, campaigns, and creator
            collaborations. Less guesswork. More momentum.
          </p>
          <div className="story-points">
            <span>
              <LinkIcon />
              Track every campaign
            </span>
            <span>
              <TrendingUp />
              Understand what converts
            </span>
            <span>
              <Users />
              Grow with compatible creators
            </span>
          </div>
        </div>
        <small>Built for independent creators. Made for clarity.</small>
      </div>
      <div className="auth-form-wrap">
        <form onSubmit={submit} className="auth-form">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">LET’S GET YOU IN THE AIR</span>
          <h2>
            {register ? "Your next chapter starts here." : "Welcome back."}
          </h2>
          <p>
            {register
              ? "Create your account. Your first tracked link is a few steps away."
              : "Sign in to your creator cockpit."}
          </p>
          <Field label="Email address">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </Field>
          <Field
            label="Password"
            hint={register ? "Use at least 10 characters." : ""}
          >
            <input
              type="password"
              minLength={register ? 10 : 1}
              autoComplete={register ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </Field>
          {register && (
            <>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                  required
                />
                I confirm I am 18 years or older.
              </label>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setLegal("terms")}
                  >
                    terms
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setLegal("privacy")}
                  >
                    privacy policy
                  </button>
                  .
                </span>
              </label>
            </>
          )}
          {error && (
            <div className="inline-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                {register ? "Create account" : "Sign in"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          {!founderOnly && (
            <p className="auth-switch">
              {register ? "Already have an account?" : "New to Naughty Pilot?"}{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Sign in" : "Create account"}
              </button>
            </p>
          )}
          <div className="secure-note">
            <LockKeyhole size={14} /> Your data belongs to you. Always.
          </div>
        </form>
      </div>
      {legal && (
        <Modal
          title={legal === "terms" ? "Terms of service" : "Privacy policy"}
          close={() => setLegal("")}
        >
          <Legal kind={legal} />
        </Modal>
      )}
    </div>
  );
}
function Onboarding({
  user,
  existing,
  onComplete,
}: {
  user: any;
  existing: any;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    niche: "Lifestyle",
    platform: "Subscription platform",
    destination: "",
    website: "",
    audience_tier: "Under 1k",
    discovery: false,
    promotion_types: ["Link Swap"],
    ...existing,
  });
  const [campaignName, setCampaignName] = useState("My first campaign"),
    [source, setSource] = useState("Reddit"),
    [firstLink, setFirstLink] = useState<any>(null);
  const titles = [
    "Make it yours.",
    "Where should your audience land?",
    "Connect your website.",
    "Bring your platforms together.",
    "Create your first tracked link.",
    "You’re ready for takeoff.",
  ];
  const set = (key: string, value: any) => setForm({ ...form, [key]: value });
  async function next() {
    setBusy(true);
    setError("");
    try {
      if (step === 0 && !form.display_name.trim())
        throw new Error("Enter your display name.");
      if (step === 1) {
        await api("/profile", "PUT", { ...form, onboarded: false });
      }
      if (step === 2 && form.website) {
        await api("/websites", "POST", { url: form.website });
        await api("/profile", "PUT", { ...form, onboarded: false });
      }
      if (step === 4) {
        const c = await api("/campaigns", "POST", {
          name: campaignName,
          source,
          destination: form.destination,
          start_date: today(),
        });
        const state = await api("/state");
        setFirstLink(state.links.find((l: any) => l.campaign_id === c.id));
      }
      if (step === 5) {
        await api("/profile", "PUT", { ...form, onboarded: true });
        onComplete();
      } else setStep(step + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding">
      <Brand />
      <div className="onboard-card">
        <div className="steps">
          {titles.map((_, i) => (
            <span key={i} className={i <= step ? "done" : ""}>
              {i < step ? <Check size={12} /> : i + 1}
            </span>
          ))}
        </div>
        <span className="eyebrow">STEP {step + 1} OF 6</span>
        <h1>{titles[step]}</h1>
        <p className="muted">
          {
            [
              "Your public creator identity. You control what you share.",
              "Add a URL you own. No platform password required.",
              "Optional now. Install first-party tracking when you’re ready.",
              "Official integrations can be connected as they become available.",
              "Use it in your next post. We’ll measure the clicks.",
              "Your dashboard starts with your real data, not made-up numbers.",
            ][step]
          }
        </p>
        {step === 0 && (
          <>
            <Field label="Display name">
              <input
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="Your creator name"
                maxLength={80}
              />
            </Field>
            <div className="form-grid">
              <Field label="Creator niche">
                <select
                  value={form.niche}
                  onChange={(e) => set("niche", e.target.value)}
                >
                  {[
                    "Lifestyle",
                    "Fitness",
                    "Fashion",
                    "Gaming",
                    "Art",
                    "Music",
                    "Other",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Audience size (self-reported)">
                <select
                  value={form.audience_tier}
                  onChange={(e) => set("audience_tier", e.target.value)}
                >
                  {["Under 1k", "1k–10k", "10k–50k", "50k+"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <Field label="Subscription platform">
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
              >
                {[
                  "Subscription platform",
                  "OnlyFans",
                  "Fansly",
                  "Patreon",
                  "Pornhub",
                  "Other",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Creator page URL">
              <input
                type="url"
                value={form.destination}
                onChange={(e) => set("destination", e.target.value)}
                placeholder="https://your-platform.com/you"
              />
            </Field>
            <div className="info">
              <ShieldCheck size={20} />
              <span>
                This saves your destination. Subscriber sync is not available;
                conversions can be reported by you.
              </span>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Website URL (optional)">
              <input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </Field>
            <div className="info">
              <Globe size={20} />
              <span>
                You’ll receive installation instructions and a domain
                verification record in Account.
              </span>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="integration-preview">
              {["Reddit", "Instagram", "X / Twitter", "Google Analytics"].map(
                (v) => (
                  <div key={v}>
                    <span className="source-symbol">{v[0]}</span>
                    <strong>{v}</strong>
                    <Badge>API setup required</Badge>
                  </div>
                ),
              )}
            </div>
            <p className="muted">
              Tracked links work without a social integration. No third-party
              account is connected automatically.
            </p>
            <label className="checkline">
              <input
                type="checkbox"
                checked={form.discovery}
                onChange={(e) => set("discovery", e.target.checked)}
              />
              Opt into Peer Swap creator discovery.
            </label>
          </>
        )}
        {step === 4 && (
          <>
            <Field label="Campaign name">
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                maxLength={100}
              />
            </Field>
            <Field label="Traffic source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {[
                  "Reddit",
                  "X / Twitter",
                  "Instagram",
                  "TikTok",
                  "YouTube",
                  "Email",
                  "Other",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <div className="destination-preview">
              <LinkIcon size={16} />
              <span>{form.destination}</span>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <div className="ready-icon">
              <Check size={32} />
            </div>
            {firstLink && (
              <div className="first-link">
                <span>Your first tracked link</span>
                <code>{firstLink.url}</code>
              </div>
            )}
            <p>
              Share your link to start recording traffic. Your first results
              will appear on Home.
            </p>
          </>
        )}
        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          {step > 0 && step < 5 ? (
            <button
              className="button"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <span />
          )}
          <button className="button primary" disabled={busy} onClick={next}>
            {busy
              ? "Saving…"
              : step === 5
                ? "Open my cockpit"
                : step === 2 && !form.website
                  ? "Skip website"
                  : step === 3
                    ? "Continue without integrations"
                    : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <small>Signed in as {user.email} · Built for creators aged 18+</small>
    </div>
  );
}
function GrowthChart({ data }: { data: any[] }) {
  const max = Math.max(1, ...data.map((d) => d.visitors));
  const points = data
    .map(
      (d, i) =>
        `${(i / (data.length - 1)) * 600},${155 - (d.visitors / max) * 125}`,
    )
    .join(" ");
  return (
    <div className="chart">
      <svg
        viewBox="0 0 600 180"
        role="img"
        aria-label="Recorded unique visitors over the last fourteen days"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f51a35" stopOpacity=".2" />
            <stop offset="100%" stopColor="#f51a35" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 70, 110, 155].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke="#2b2e32"
            strokeDasharray="4 6"
          />
        ))}
        <polygon points={`0,155 ${points} 600,155`} fill="url(#chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#f51a35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="chart-labels">
        {data
          .filter((_, i) => [0, 4, 9, 13].includes(i))
          .map((d) => (
            <span key={d.date}>
              {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ))}
      </div>
    </div>
  );
}
function currentSection() {
  const path = location.pathname.replace(/^\/|\/$/g, "") || "home";
  return NAV.some((n) => n[2] === path) || path === "admin" ? path : "home";
}
export function App() {
  const [founderOnly, setFounderOnly] = useState(founderBuild);
  const [boot, setBoot] = useState(true),
    [user, setUser] = useState<any>(null),
    [profile, setProfile] = useState<any>(null),
    [state, setState] = useState<any>(null),
    [section, setSection] = useState(currentSection),
    [range, setRange] = useState("30"),
    [custom, setCustom] = useState({ from: today(), to: today() }),
    [model, setModel] = useState("last-touch"),
    [modal, setModal] = useState<any>(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState("All sources"),
    [peerFilters, setPeerFilters] = useState({
      niche: "All niches",
      audience: "All audiences",
      platform: "All platforms",
      promotion: "All promotions",
      availability: "Available",
      traffic: "All traffic ranges",
      region: "",
    }),
    [compare, setCompare] = useState<string[]>([]),
    [notifications, setNotifications] = useState(false),
    [searchQuery, setSearchQuery] = useState("");
  const timer = useRef<any>(null);
  function message(t: string) {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4000);
  }
  function navigate(s: string) {
    setSection(s);
    history.pushState({}, "", `/${s}`);
    setModal(null);
    setSearchQuery("");
    setNotifications(false);
    setError("");
    window.scrollTo(0, 0);
  }
  const rangeParams = () => {
    const end = new Date();
    if (range === "custom")
      return `from=${encodeURIComponent(custom.from + "T00:00:00.000Z")}&to=${encodeURIComponent(custom.to + "T23:59:59.999Z")}`;
    const start = new Date();
    if (range === "today") start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - Number(range));
    return `from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`;
  };
  async function refresh() {
    const s = await api(`/state?${rangeParams()}&model=${model}`);
    setState(s);
    setProfile(s.profile);
  }
  async function bootup() {
    try {
      const d = await api("/auth/me");
      setFounderOnly(founderBuild || !!d.founder_only);
      setUser(d.user);
      setProfile(d.profile);
      if (d.profile?.onboarded) await refresh();
    } catch (e: any) {
      if (e.status === 401) setUser(null);
      else setError(e.message);
    } finally {
      setBoot(false);
    }
  }
  useEffect(() => {
    bootup();
    const h = () => {
      setSection(currentSection());
      setModal(null);
      setSearchQuery("");
      setNotifications(false);
      setError("");
    };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);
  useEffect(() => {
    if (user && profile?.onboarded) refresh().catch((e) => setError(e.message));
  }, [range, custom.from, custom.to, model]);
  useEffect(() => {
    if (!user || !profile?.onboarded) return;
    const t = setInterval(() => refresh().catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [user, profile?.onboarded, range, model]);
  async function perform(
    fn: () => Promise<any>,
    success: string,
    close = true,
    reload = true,
  ) {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (reload) await refresh();
      message(success);
      if (close) setModal(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      message("Copied to clipboard");
    } catch {
      setModal({ type: "copy", value });
    }
  }
  const formData = (e: React.FormEvent) =>
    Object.fromEntries(new FormData(e.target as HTMLFormElement));
  function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    const b: any = formData(e);
    perform(async () => {
      await api("/campaigns", "POST", b);
      setSource("All sources");
    }, "Campaign and tracking link created");
  }
  async function showQR(link: any) {
    try {
      const data = await QRCode.toDataURL(link.url, {
        width: 300,
        margin: 2,
        color: { dark: "#17191b", light: "#ffffff" },
      });
      setModal({ type: "qr", link, data });
    } catch {
      message("Could not create QR code.");
    }
  }
  if (boot)
    return (
      <div className="loading-page">
        <Brand />
        <Loader2 className="spin" />
        <p>Opening your cockpit…</p>
      </div>
    );
  if (!user) return <Auth onSuccess={bootup} founderOnly={founderOnly} />;
  if (!profile?.onboarded)
    return <Onboarding user={user} existing={profile} onComplete={bootup} />;
  if (!state)
    return (
      <div className="loading-page">
        <Brand />
        <p>{error || "Loading your results…"}</p>
        <button
          className="button"
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          Retry
        </button>
      </div>
    );
  const m = state.metrics,
    p = state.profile,
    activeSwaps = state.swaps.filter((s: any) => s.status === "accepted"),
    unread = state.notifications.filter((n: any) => !n.read).length;
  const filteredCampaigns = state.campaigns.filter(
    (c: any) => source === "All sources" || c.source === source,
  );
  const peers = state.peers.filter(
    (p: any) =>
      (peerFilters.niche === "All niches" || p.niche === peerFilters.niche) &&
      (peerFilters.audience === "All audiences" ||
        p.audience_tier === peerFilters.audience) &&
      (peerFilters.traffic === "All traffic ranges" ||
        p.traffic_tier === peerFilters.traffic) &&
      (peerFilters.platform === "All platforms" ||
        p.platform === peerFilters.platform) &&
      (peerFilters.promotion === "All promotions" ||
        p.promotion_types.includes(peerFilters.promotion)) &&
      (peerFilters.availability !== "Available" || p.availability) &&
      (!peerFilters.region ||
        p.region.toLowerCase().includes(peerFilters.region.toLowerCase())),
  );
  const subscribers = state.subscriber_count || {
    value: p.current_subscribers,
    evidence: "creator_reported",
  };
  const top = m.rows
    .slice()
    .sort((a: any, b: any) => b.conversionRate - a.conversionRate)[0];
  const searchItems = [
    ...state.sources
      .filter((name: string) =>
        name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((name: string) => ({
        id: "source-" + name,
        name,
        kind: "Source",
        action: () => {
          setSource(name);
          navigate("campaigns");
        },
      })),
    ...state.campaigns
      .filter((c: any) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        kind: "Campaign",
        action: () => setModal({ type: "campaign-detail", campaign: c }),
      })),
    ...state.links
      .filter((l: any) =>
        (l.name + " " + l.slug)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        kind: "Link",
        action: () => setModal({ type: "link-detail", link: l }),
      })),
  ].slice(0, 8);
  const heading: any = {
    automation: [
      "Your promotion schedule.",
      "Plan promotions and follow up on reminders.",
    ],
    templates: [
      "Campaign templates.",
      "Save reusable starting points for your promotions.",
    ],
    "content-library": [
      "Your content, organized.",
      "Save public content references and campaign captions.",
    ],
    subscriptions: [
      "Your subscription platforms.",
      "Manage subscriber connections and reported counts.",
    ],
    settings: [
      "Your preferences and privacy.",
      "Manage your creator profile and account controls.",
    ],
    home: [
      "Your growth, at a glance.",
      "A clear view of where your audience comes from.",
    ],
    traffic: [
      "Every source. One clear view.",
      "See which channels bring people—and which ones convert.",
    ],
    campaigns: [
      "Make every promotion count.",
      "Simple campaigns. Clear results.",
    ],
    "peer-swap": [
      "Grow better, together.",
      "Find compatible creators. Share audiences. Measure the impact.",
    ],
    links: [
      "Your links, working harder.",
      "Create it. Share it. Know what happened.",
    ],
    analytics: [
      "The story behind your growth.",
      "Understand attribution, conversions, and campaign value.",
    ],
    account: [
      "Your cockpit. Your rules.",
      "Manage your identity, connections, and privacy.",
    ],
  };
  return (
    <div
      className={`app-shell reference-theme ${section === "home" ? "dashboard-view" : ""}`}
    >
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">CREATOR WORKSPACE</div>
        <nav aria-label="Primary navigation">
          {NAV.map(([label, Icon, key]) => (
            <button
              key={key}
              className={section === key ? "nav-item active" : "nav-item"}
              onClick={() => navigate(key)}
              aria-label={label}
              aria-current={section === key ? "page" : undefined}
            >
              <Icon size={19} />
              <span>
                {(
                  {
                    Home: "Dashboard",
                    Traffic: "Top Sources",
                    Campaigns: "Campaigns",
                    "Peer Swap": "Pure Swap",
                    Links: "Link Analytics",
                    Analytics: "Traffic Hub",
                    Account: "My Accounts",
                  } as any
                )[label] || label}
              </span>
              {key === "peer-swap" &&
                state.swaps.filter(
                  (s: any) => s.to_id === user.id && s.status === "pending",
                ).length > 0 && (
                  <span className="nav-count">
                    {
                      state.swaps.filter(
                        (s: any) =>
                          s.to_id === user.id && s.status === "pending",
                      ).length
                    }
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="attribution-note">
            <ShieldCheck size={19} />
            <strong>Your growth. Honestly measured.</strong>
            <p>First-party tracking. No invented subscribers.</p>
          </div>
          <button
            className="creator-switch"
            onClick={() => navigate("account")}
          >
            <span className="avatar small">{initials(p.display_name)}</span>
            <span>
              <strong>{p.display_name}</strong>
              <small>Creator account</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="np-search-wrap">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search sources, campaigns, or links"
              placeholder="Search sources, campaigns, or links…"
              value={searchQuery}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
                if (e.key === "Enter" && searchItems.length) {
                  searchItems[0].action();
                  setSearchQuery("");
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.trim() && (
              <div
                className="np-search-results"
                role="region"
                aria-label="Search results"
              >
                {searchItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setSearchQuery("");
                    }}
                  >
                    <span>{item.name}</span>
                    <small>{item.kind}</small>
                  </button>
                ))}
                {searchItems.length === 0 && (
                  <p className="np-search-empty" role="status">
                    No matching sources, campaigns, or links.
                  </p>
                )}
                <small className="np-search-help">
                  Search your recorded sources, campaigns, and links.
                </small>
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="button primary np-header-create"
              aria-label="Create a new campaign"
              onClick={() => setModal({ type: "campaign" })}
            >
              <Plus size={19} />
              New Campaign
            </button>
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => navigate("account")}
            >
              <Settings size={23} />
            </button>
            <span className="status-chip">
              <span className="status-dot" />
              First-party tracking
            </span>
            <button
              className="icon-button bell-button"
              aria-label={`Notifications (${unread} unread)`}
              onClick={() => {
                setNotifications(!notifications);
                if (!notifications)
                  perform(
                    () => api("/notifications/read", "POST", {}),
                    "Notifications marked read",
                    false,
                  );
              }}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <button
              className="avatar small"
              aria-label="Open account"
              onClick={() => navigate("account")}
            >
              {initials(p.display_name)}
            </button>
          </div>
        </header>
        {notifications && (
          <div className="notifications-panel">
            <h3>Updates that matter</h3>
            {state.notifications.length ? (
              state.notifications.slice(0, 8).map((n: any) => (
                <div key={n.id}>
                  <span className="status-dot" />
                  <p>
                    {n.message}
                    <small>{new Date(n.created_at).toLocaleString()}</small>
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">
                No notifications yet. Campaign and collaboration updates will
                appear here.
              </p>
            )}
          </div>
        )}
        <main id="main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {section === "home"
                  ? `WELCOME BACK, ${p.display_name.toUpperCase()}`
                  : "YOUR CREATOR COCKPIT"}
              </span>
              <h1>{heading[section]?.[0] || "Platform operations"}</h1>
              <p>{heading[section]?.[1] || "Separate administrator access."}</p>
            </div>
            {![
              "home",
              "account",
              "peer-swap",
              "admin",
              "settings",
              "subscriptions",
              "templates",
              "automation",
              "content-library",
            ].includes(section) && (
              <button
                className="button primary"
                onClick={() => {
                  setError("");
                  setModal({ type: "campaign" });
                }}
              >
                <Plus size={17} />
                {section === "links" ? "Create link" : "New campaign"}
              </button>
            )}
          </div>
          {state.founder_only && (
            <div className="panel">
              <span>
                Real spending disabled · Planning{" "}
                {state.founder_controls?.paused ? "paused" : "enabled"}
              </span>{" "}
              <button className="button" onClick={() => navigate("admin")}>
                Founder controls
              </button>
            </div>
          )}
          {state.data_truncated && (
            <p role="status">
              Analytics cover the most recent 10,000 events and conversions.
              Older records remain stored in Supabase.
            </p>
          )}
          {state.has_demo && (
            <div className="demo-banner">
              <Radio size={18} />
              <span>
                <strong>Development sample data is visible.</strong> These are
                simulated events, not your real subscribers or revenue.
              </span>
              <button
                onClick={() =>
                  perform(
                    () => api("/development/sample", "DELETE"),
                    "Sample traffic cleared",
                    false,
                  )
                }
              >
                Clear samples
              </button>
            </div>
          )}
          {error && !modal && (
            <div className="inline-error global-error" role="alert">
              {error}
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {["home", "traffic", "campaigns", "analytics"].includes(section) && (
            <div className="range-bar">
              <div className="segmented" aria-label="Date range">
                {[
                  ["today", "Today"],
                  ["7", "7 days"],
                  ["30", "30 days"],
                  ["90", "90 days"],
                  ["custom", "Custom"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={range === key ? "selected" : ""}
                    onClick={() => setRange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {range === "custom" && (
                <div className="custom-range">
                  <input
                    aria-label="Range start"
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) =>
                      setCustom({ ...custom, from: e.target.value })
                    }
                  />
                  <span>to</span>
                  <input
                    aria-label="Range end"
                    type="date"
                    value={custom.to}
                    min={custom.from}
                    onChange={(e) =>
                      setCustom({ ...custom, to: e.target.value })
                    }
                  />
                </div>
              )}
              <span className="range-note">
                <span className="status-dot" />
                Recorded data ·{" "}
                {model === "last-touch" ? "last touch" : "first touch"}
              </span>
            </div>
          )}
          {section === "home" && (
            <Dashboard
              state={state}
              subscribers={subscribers}
              navigate={navigate}
              create={(preset: any = {}) =>
                setModal({ type: "campaign", ...preset })
              }
              selectSource={(name: string) => {
                setSource(name);
                navigate("campaigns");
              }}
              openCampaign={(campaign: any) =>
                setModal({ type: "campaign-detail", campaign })
              }
              openPeer={(peer: any) => setModal({ type: "swap", peer })}
              openActivity={() => setModal({ type: "activity" })}
              openTemplates={() => setModal({ type: "templates" })}
              GrowthChart={GrowthChart}
            />
          )}
          {section === "traffic" && (
            <>
              <div className="mini-metrics">
                <Metric
                  label="Unique visitors"
                  value={num(m.visitors)}
                  detail="Anonymous first-party sessions"
                />
                <Metric
                  label="Attributed subscribers"
                  value={num(m.conversions)}
                  detail="Creator-provided reports"
                />
                <Metric
                  label="Revenue per visitor"
                  value={money(m.visitors ? m.revenue / m.visitors : 0)}
                  detail="Creator-reported · USD"
                />
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Source leaderboard</h2>
                    <p>
                      Conversion = attributed subscriber reports ÷ unique
                      visitors
                    </p>
                  </div>
                  <Badge>{m.rows.length} sources</Badge>
                </div>
                {m.rows.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Traffic source</th>
                          <th>Traffic</th>
                          <th>Visitors</th>
                          <th>Outbound clicks</th>
                          <th>Subscribers</th>
                          <th>Conversion</th>
                          <th>Revenue</th>
                          <th>Rev / visitor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.rows.map((r: any) => (
                          <tr key={r.source}>
                            <td>
                              <button
                                className="table-link"
                                onClick={() => {
                                  setSource(r.source);
                                  navigate("campaigns");
                                }}
                              >
                                <span className="source-symbol">
                                  {r.source[0]}
                                </span>
                                {r.source}
                                <ArrowUpRight size={14} />
                              </button>
                            </td>
                            <td>{num(r.traffic)}</td>
                            <td>{num(r.visitors)}</td>
                            <td>{num(r.clicks)}</td>
                            <td>{r.subscribers}</td>
                            <td>{pct(r.conversionRate)}</td>
                            <td>{money(r.revenue)}</td>
                            <td>{money(r.rpv)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={Activity}
                    title="See where your audience comes from"
                    description="Your source leaderboard fills as people click tracked links or visit your verified website."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setModal({ type: "campaign" })}
                      >
                        <Plus size={16} />
                        Create a tracked link
                      </button>
                    }
                  />
                )}
              </section>
              <div className="info">
                <CircleHelp size={19} />
                <span>
                  Clicks and page visits are separate events. Unique visitors
                  are anonymous sessions, not identified people. Country is
                  shown only when legitimately available.
                </span>
              </div>
            </>
          )}
          {section === "campaigns" && (
            <>
              <div className="toolbar">
                <div className="filter-control">
                  <SlidersHorizontal size={16} />
                  <select
                    aria-label="Campaign source filter"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option>All sources</option>
                    {state.sources.map((v: string) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <span className="muted">
                  {filteredCampaigns.length} campaign
                  {filteredCampaigns.length !== 1 ? "s" : ""}
                </span>
                <button
                  className="button"
                  disabled={compare.length < 2}
                  onClick={() => setModal({ type: "compare" })}
                >
                  <BarChart3 size={16} />
                  Compare ({compare.length})
                </button>
              </div>
              {filteredCampaigns.length ? (
                <div className="campaign-grid">
                  {filteredCampaigns.map((c: any) => (
                    <article className="panel campaign-card" key={c.id}>
                      <div className="campaign-top">
                        <span className="source-symbol">{c.source[0]}</span>
                        <Badge tone="green">{c.status}</Badge>
                        {c.demo && <Badge tone="accent">Sample</Badge>}
                        <label className="compare-check">
                          <input
                            type="checkbox"
                            aria-label={`Compare ${c.name}`}
                            checked={compare.includes(c.id)}
                            onChange={(e) =>
                              setCompare(
                                e.target.checked
                                  ? [...compare, c.id].slice(-4)
                                  : compare.filter((id) => id !== c.id),
                              )
                            }
                          />
                        </label>
                      </div>
                      <h2>{c.name}</h2>
                      <p>
                        {c.source} ·{" "}
                        {new Date(c.start_date).toLocaleDateString()}
                      </p>
                      <div className="campaign-numbers">
                        <span>
                          <strong>{num(c.metrics.visitors)}</strong>Visitors
                        </span>
                        <span>
                          <strong>{num(c.metrics.conversions)}</strong>
                          Subscribers
                        </span>
                        <span>
                          <strong>{money(c.metrics.revenue)}</strong>Revenue
                        </span>
                      </div>
                      <footer>
                        <span>{pct(c.metrics.conversionRate)} conversion</span>
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({ type: "campaign-detail", campaign: c })
                          }
                        >
                          View results
                          <ArrowUpRight size={15} />
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    icon={Megaphone}
                    title={
                      source === "All sources"
                        ? "Your first campaign starts here"
                        : "No campaigns for this source"
                    }
                    description="Give your promotion a name, choose a source, and get a tracking link automatically."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setModal({ type: "campaign" })}
                      >
                        <Plus size={16} />
                        Create campaign
                      </button>
                    }
                  />
                </section>
              )}
            </>
          )}
          {section === "links" && (
            <>
              <div className="info">
                <LinkIcon size={19} />
                <span>
                  Each link belongs to a campaign and keeps its source through
                  the funnel. Share it wherever you promote.
                </span>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Tracked links</h2>
                    <p>
                      {state.links.length} links · anonymous first-party
                      tracking
                    </p>
                  </div>
                </div>
                {state.links.length ? (
                  <div className="links-list">
                    {state.links.map((l: any) => (
                      <article key={l.id}>
                        <div className="link-details">
                          <div>
                            <h3>{l.name}</h3>
                            <Badge
                              tone={l.status === "active" ? "green" : "neutral"}
                            >
                              {l.status}
                            </Badge>
                            {l.demo && <Badge tone="accent">Sample</Badge>}
                          </div>
                          <code>{l.url}</code>
                          <small>
                            {l.source} · {num(l.click_count)} clicks ·{" "}
                            {num(l.unique_click_count)} unique ·{" "}
                            {l.conversion_count} reports · {money(l.revenue)}
                          </small>
                          <span className="destination-label">
                            <ArrowUpRight size={12} />
                            {l.destination}
                          </span>
                        </div>
                        <div className="link-actions">
                          <button
                            className="button"
                            onClick={() => copy(l.url)}
                            aria-label={`Copy ${l.name}`}
                          >
                            <Copy size={15} />
                            Copy
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => showQR(l)}
                            aria-label={`QR code for ${l.name}`}
                          >
                            <QrCode size={19} />
                          </button>
                          <button
                            className="text-button"
                            onClick={() =>
                              perform(
                                () =>
                                  api("/links/" + l.id, "PATCH", {
                                    status:
                                      l.status === "active"
                                        ? "paused"
                                        : "active",
                                  }),
                                l.status === "active"
                                  ? "Link paused"
                                  : "Link resumed",
                                false,
                              )
                            }
                          >
                            {l.status === "active" ? "Pause" : "Resume"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={LinkIcon}
                    title="One link. A clearer picture."
                    description="Create your first tracked link and use it in your next post, story, email, or promotion."
                    action={
                      <button
                        className="button primary"
                        onClick={() => setModal({ type: "campaign" })}
                      >
                        <Plus size={16} />
                        Create link
                      </button>
                    }
                  />
                )}
              </section>
            </>
          )}
          {section === "peer-swap" && (
            <>
              <div className="peer-header">
                <div className="info">
                  <Users size={20} />
                  <span>
                    Mutual consent. Clear expectations. Measured outcomes. Your
                    subscriber identities are never shared.
                  </span>
                </div>
                <button className="button" onClick={() => navigate("account")}>
                  <UserRound size={16} />
                  {p.discovery
                    ? "Edit discovery profile"
                    : "Opt into discovery"}
                </button>
              </div>
              <section className="panel swap-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your collaborations</h2>
                    <p>Requests, active swaps, and measured results</p>
                  </div>
                  <Badge>{activeSwaps.length} active</Badge>
                </div>
                {state.swaps.length ? (
                  <div className="swap-list">
                    {state.swaps.map((s: any) => (
                      <div key={s.id} className="swap-item">
                        <span className="avatar">
                          {initials(
                            s.partner?.display_name || "Deleted creator",
                          )}
                        </span>
                        <div className="swap-main">
                          <h3>
                            {s.partner?.display_name || "Deleted creator"}{" "}
                            {s.demo && <Badge tone="accent">Sample</Badge>}
                          </h3>
                          <p>
                            {s.type} · {s.platform} · {s.duration} days ·{" "}
                            {new Date(s.start_date).toLocaleDateString()}
                          </p>
                          {s.note && <small>{s.note}</small>}
                        </div>
                        <Badge
                          tone={
                            s.status === "accepted"
                              ? "green"
                              : s.status === "pending"
                                ? "accent"
                                : "neutral"
                          }
                        >
                          {s.status}
                        </Badge>
                        <div className="swap-actions">
                          {["pending", "countered"].includes(s.status) &&
                            (s.status === "countered"
                              ? s.from_id === user.id
                              : s.to_id === user.id) && (
                              <>
                                <button
                                  className="button primary small-button"
                                  onClick={() =>
                                    perform(
                                      () =>
                                        api(`/swaps/${s.id}/respond`, "POST", {
                                          action: "accept",
                                        }),
                                      "Swap accepted. Both tracking links are ready.",
                                    )
                                  }
                                  disabled={busy}
                                >
                                  Accept
                                </button>
                                <button
                                  className="button small-button"
                                  onClick={() =>
                                    perform(
                                      () =>
                                        api(`/swaps/${s.id}/respond`, "POST", {
                                          action: "decline",
                                        }),
                                      "Swap declined",
                                    )
                                  }
                                  disabled={busy}
                                >
                                  Decline
                                </button>
                                {s.status === "pending" && (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      setModal({ type: "counter", swap: s })
                                    }
                                  >
                                    Counter
                                  </button>
                                )}
                              </>
                            )}
                          {s.demo &&
                            s.status === "pending" &&
                            s.from_id === user.id && (
                              <button
                                className="button small-button"
                                onClick={() =>
                                  perform(
                                    () =>
                                      api(
                                        `/development/swaps/${s.id}/accept`,
                                        "POST",
                                        {},
                                      ),
                                    "Sample partner acceptance simulated",
                                  )
                                }
                                disabled={busy}
                              >
                                Simulate acceptance
                              </button>
                            )}
                          {["accepted", "completed"].includes(s.status) && (
                            <button
                              className="button small-button"
                              onClick={() =>
                                setModal({ type: "swap-result", swap: s })
                              }
                            >
                              Results
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="compact-empty">
                    <Users size={24} />
                    <p>
                      No collaborations yet. Find a creator below and propose
                      your first swap.
                    </p>
                  </div>
                )}
              </section>
              <div className="section-heading">
                <div>
                  <h2>Find your next growth partner.</h2>
                  <p>
                    Matches use self-reported niche and audience size. No
                    invented performance scores.
                  </p>
                </div>
                <Badge>{peers.length} creators</Badge>
              </div>
              <div className="peer-filters">
                <select
                  aria-label="Niche filter"
                  value={peerFilters.niche}
                  onChange={(e) =>
                    setPeerFilters({ ...peerFilters, niche: e.target.value })
                  }
                >
                  <option>All niches</option>
                  {[...new Set(state.peers.map((p: any) => p.niche))].map(
                    (v: any) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="Audience filter"
                  value={peerFilters.audience}
                  onChange={(e) =>
                    setPeerFilters({ ...peerFilters, audience: e.target.value })
                  }
                >
                  {[
                    "All audiences",
                    "Under 1k",
                    "1k–10k",
                    "10k–50k",
                    "50k+",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  aria-label="Peer platform filter"
                  value={peerFilters.platform}
                  onChange={(e) =>
                    setPeerFilters({ ...peerFilters, platform: e.target.value })
                  }
                >
                  <option>All platforms</option>
                  {[...new Set(state.peers.map((p: any) => p.platform))].map(
                    (v: any) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="Promotion type filter"
                  value={peerFilters.promotion}
                  onChange={(e) =>
                    setPeerFilters({
                      ...peerFilters,
                      promotion: e.target.value,
                    })
                  }
                >
                  <option>All promotions</option>
                  {state.swap_types.map((v: string) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  aria-label="Traffic range filter"
                  value={peerFilters.traffic}
                  onChange={(e) =>
                    setPeerFilters({ ...peerFilters, traffic: e.target.value })
                  }
                >
                  {[
                    "All traffic ranges",
                    "No recorded traffic",
                    "Under 100 visits",
                    "100–1k visits",
                    "1k–10k visits",
                    "10k+ visits",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  aria-label="Availability filter"
                  value={peerFilters.availability}
                  onChange={(e) =>
                    setPeerFilters({
                      ...peerFilters,
                      availability: e.target.value,
                    })
                  }
                >
                  <option>Available</option>
                  <option>Any availability</option>
                </select>
                <input
                  aria-label="Country or region filter"
                  value={peerFilters.region}
                  onChange={(e) =>
                    setPeerFilters({ ...peerFilters, region: e.target.value })
                  }
                  placeholder="Country / region"
                />
              </div>
              {peers.length ? (
                <div className="peer-grid">
                  {peers.map((peer: any) => (
                    <article className="panel peer-card" key={peer.id}>
                      <div className="peer-card-top">
                        <span className="avatar large">
                          {initials(peer.display_name)}
                        </span>
                        <Badge
                          tone={
                            peer.match === "Excellent Match"
                              ? "green"
                              : "neutral"
                          }
                        >
                          {peer.match}
                        </Badge>
                      </div>
                      <h2>
                        {peer.display_name}
                        {peer.demo && <Badge tone="accent">Sample</Badge>}
                      </h2>
                      <p>
                        {peer.niche} · {peer.platform}
                      </p>
                      <div className="peer-stats">
                        <span>
                          <strong>{peer.audience_tier}</strong>Audience ·
                          self-reported
                        </span>
                        <span>
                          <strong>{peer.history}</strong>Completed swaps
                        </span>
                      </div>
                      <div className="peer-tags">
                        {peer.promotion_types.map((v: string) => (
                          <Badge key={v}>{v}</Badge>
                        ))}
                      </div>
                      <small className="peer-disclaimer">
                        Traffic: {peer.traffic_tier.toLowerCase()} (30 days)
                        <br />
                        Engagement: not verified · Reliability:{" "}
                        {peer.reliability.toLowerCase()}
                      </small>
                      <div className="peer-card-footer">
                        <button
                          className="button primary"
                          onClick={() => setModal({ type: "swap", peer })}
                          disabled={!peer.availability}
                        >
                          <Send size={15} />
                          Propose swap
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Safety controls for ${peer.display_name}`}
                          onClick={() =>
                            setModal({ type: "peer-safety", peer })
                          }
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    icon={Users}
                    title="Room for the right connection"
                    description="No opted-in creators match these filters yet. Invite another creator to sign up, or explore labeled development samples in Account."
                  />
                </section>
              )}
            </>
          )}
          {section === "analytics" && (
            <>
              <section className="panel attribution-panel">
                <div>
                  <span className="eyebrow">UNDERSTANDABLE ATTRIBUTION</span>
                  <h2>Credit where the evidence points.</h2>
                  <p>
                    We connect anonymous tracked-link sessions to the conversion
                    reports you record. We don’t claim access to subscriber data
                    your platform doesn’t provide.
                  </p>
                </div>
                <Field label="Attribution model">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="last-touch">
                      Last tracked touch (default)
                    </option>
                    <option value="first-touch">First tracked touch</option>
                  </select>
                </Field>
              </section>
              <div className="mini-metrics">
                <Metric
                  label="Attributed conversions"
                  value={m.conversions}
                  detail="Creator-reported · linked campaign"
                />
                <Metric
                  label="Uncertain reports"
                  value={m.unverified}
                  detail="Not credited to any campaign"
                />
                <Metric
                  label="Campaign revenue"
                  value={money(m.revenue)}
                  detail="Creator-provided amounts · USD"
                />
              </div>
              <div className="toolbar">
                <p className="muted">
                  Conversions are not inferred from clicks.
                </p>
                <button
                  className="button primary"
                  onClick={() => setModal({ type: "conversion" })}
                >
                  <Plus size={16} />
                  Record conversion
                </button>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your conversion funnel</h2>
                    <p>
                      Events are measured separately; this is not a complete
                      platform funnel.
                    </p>
                  </div>
                </div>
                <div className="funnel">
                  {[
                    ["Unique visitors", m.visitors],
                    ["Outbound clicks", m.clicks],
                    ["Attributed subscriber reports", m.conversions],
                  ].map(([label, value], i) => (
                    <div key={String(label)}>
                      <span>0{i + 1}</span>
                      <p>{label}</p>
                      <strong>{num(value)}</strong>
                      <div
                        style={{
                          width: `${Math.max(2, Math.min(100, (Number(value) / Math.max(1, m.visitors)) * 100))}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent tracking events</h2>
                    <p>Anonymous sessions · no subscriber identities</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Refresh tracking events"
                    onClick={() => refresh().catch((e) => setError(e.message))}
                  >
                    <RefreshCw size={17} />
                  </button>
                </div>
                {state.events.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Source</th>
                          <th>Device</th>
                          <th>Country</th>
                          <th>Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.events.slice(0, 15).map((e: any) => (
                          <tr key={e.id}>
                            <td>
                              {e.type.replaceAll("_", " ")}{" "}
                              {e.demo && <Badge tone="accent">Sample</Badge>}
                            </td>
                            <td>{e.source_id || "Direct traffic"}</td>
                            <td>{e.device_category || "Unknown"}</td>
                            <td>{e.country || "Not available"}</td>
                            <td>{new Date(e.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={Radio}
                    title="Listening for your first event"
                    description="Use a tracked link or install tracking on your verified website."
                  />
                )}
              </section>
            </>
          )}
          {["templates", "content-library", "automation"].includes(section) && (
            <WorkspaceScreen
              key={section}
              kind={
                section === "templates"
                  ? "template"
                  : section === "content-library"
                    ? "content"
                    : "schedule"
              }
              state={state}
              api={api}
              perform={perform}
              busy={busy}
              navigate={navigate}
              create={(preset: any) =>
                setModal({ type: "campaign", ...preset })
              }
            />
          )}
          {section === "subscriptions" && (
            <SubscriberConnections
              state={state}
              busy={busy}
              perform={perform}
              setModal={setModal}
            />
          )}
          {section === "settings" && (
            <div className="np-settings-view">
              <Account
                state={state}
                busy={busy}
                perform={perform}
                api={api}
                copy={copy}
                setModal={setModal}
                logout={() =>
                  perform(
                    () => api("/auth/logout", "POST", {}),
                    "Signed out",
                    true,
                    false,
                  ).then(bootup)
                }
              />
            </div>
          )}
          {section === "account" && (
            <Account
              state={state}
              busy={busy}
              perform={perform}
              api={api}
              copy={copy}
              setModal={setModal}
              logout={() => {
                setUser(null);
                setState(null);
                navigate("home");
              }}
            />
          )}
          {section === "admin" && <Admin />}
          <footer className="page-footer">
            <span>Naughty Pilot · Your creator growth cockpit</span>
            <span>
              USD ·{" "}
              {state.development
                ? "Development environment"
                : "Self-hosted environment"}
              <button
                className="text-button"
                onClick={() => setModal({ type: "privacy" })}
              >
                Privacy
              </button>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.slice(0, 7).map(([label, Icon, key]) => (
          <button
            key={key}
            className={section === key ? "active" : ""}
            aria-current={section === key ? "page" : undefined}
            onClick={() => navigate(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          aria-label="More screens"
          onClick={() => setModal({ type: "navigation" })}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                navigation: "All screens",
                activity: "Recent activity",
                templates: "Campaign templates",
                "link-detail": "Tracked link details",
                subscription: "Add your creator page",
                campaign: "Create a campaign & tracked link",
                qr: "Share your tracking link",
                copy: "Copy this value",
                compare: "Compare campaigns",
                "campaign-detail": "Campaign results",
                swap: "Propose a Peer Swap",
                counter: "Propose a new schedule",
                "swap-result": "Collaboration results",
                "peer-safety": "Creator safety",
                conversion: "Record a subscriber conversion",
                terms: "Terms of service",
                privacy: "Privacy & consent",
              } as any
            )[modal.type] || "Details"
          }
          close={() => {
            setModal(null);
            setError("");
          }}
          wide={["compare", "swap-result", "campaign-detail"].includes(
            modal.type,
          )}
        >
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          {modal.type === "navigation" && (
            <div className="np-all-screens">
              {NAV.map(([label, Icon, key]) => (
                <button
                  className="button"
                  key={key}
                  onClick={() => navigate(key)}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          )}
          {modal.type === "activity" && (
            <div className="np-full-activity">
              {state.notifications.length ? (
                state.notifications.map((n: any) => (
                  <article key={n.id}>
                    <Activity size={18} />
                    <div>
                      <p>{n.message}</p>
                      <small>{new Date(n.created_at).toLocaleString()}</small>
                    </div>
                  </article>
                ))
              ) : (
                <p>
                  No activity yet. Campaign and swap updates will appear here.
                </p>
              )}
            </div>
          )}
          {modal.type === "templates" && (
            <div className="np-template-picker">
              {campaignPresets.map(([name, source, image]) => (
                <button
                  key={name}
                  onClick={() =>
                    name === "Pure Swap"
                      ? navigate("peer-swap")
                      : setModal({ type: "campaign", name, source })
                  }
                >
                  <img src={image} alt="" />
                  <span>
                    <strong>{name}</strong>
                    <small>{source} · customize before creating</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
          )}
          {modal.type === "link-detail" && (
            <div className="np-link-detail">
              <h3>{modal.link.name}</h3>
              <code>{modal.link.url}</code>
              <p>
                {modal.link.source} · {modal.link.status}
              </p>
              <p>
                {modal.link.click_count} clicks ·{" "}
                {modal.link.unique_click_count} unique visitors ·{" "}
                {modal.link.conversion_count} creator-reported conversions
              </p>
              <p>Destination: {modal.link.destination}</p>
              <div className="np-detail-actions">
                <button
                  className="button primary"
                  onClick={() => copy(modal.link.url)}
                >
                  Copy link
                </button>
                <button className="button" onClick={() => showQR(modal.link)}>
                  Show QR code
                </button>
                <button
                  className="button"
                  onClick={() => {
                    const c = state.campaigns.find(
                      (c: any) => c.id === modal.link.campaign_id,
                    );
                    if (c) setModal({ type: "campaign-detail", campaign: c });
                  }}
                >
                  View campaign results
                </button>
              </div>
            </div>
          )}
          {modal.type === "subscription" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const values = formData(e);
                perform(
                  () =>
                    api("/accounts", "POST", {
                      provider: modal.provider,
                      ...values,
                    }),
                  "Creator page saved. Counts are labeled creator-reported.",
                );
              }}
            >
              <p className="muted">
                {modal.provider} public creator page. No verified official
                subscriber-sync API is configured for this platform.
              </p>
              <div className="info">
                <ShieldCheck size={18} />
                <span>
                  Never enter your platform password, login cookies, or private
                  subscriber information.
                </span>
              </div>
              <Field label={`${modal.provider} creator URL`}>
                <input
                  name="url"
                  type="url"
                  required
                  defaultValue={modal.account?.url || ""}
                  placeholder={`https://${({ OnlyFans: "onlyfans.com", Fansly: "fansly.com", Pornhub: "pornhub.com" } as any)[modal.provider]}/your-page`}
                />
              </Field>
              <Field
                label="Current paid subscribers (optional)"
                hint="This is a count you provide, not live platform data. For Pornhub, do not enter free followers as paid subscribers."
              >
                <input
                  name="manual_subscribers"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={modal.account?.manual_subscribers ?? ""}
                />
              </Field>
              <button className="button primary full" disabled={busy}>
                {busy ? "Saving…" : "Save creator page"}
              </button>
            </form>
          )}
          {modal.type === "campaign" && (
            <form onSubmit={createCampaign}>
              <p className="muted">
                One simple campaign. One unique link. Every click accounted for.
              </p>
              <Field label="Campaign name">
                <input
                  name="name"
                  defaultValue={modal.name || ""}
                  required
                  maxLength={100}
                  placeholder="e.g. Reddit weekend launch"
                />
              </Field>
              <div className="form-grid">
                <Field label="Traffic source">
                  <select
                    name="source"
                    defaultValue={
                      modal.source ||
                      (source === "All sources" ? "Reddit" : source)
                    }
                  >
                    {state.sources.map((v: string) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Peer partner (optional)">
                  <select name="peer_id">
                    <option value="">No peer partner</option>
                    {state.peers.map((v: any) => (
                      <option key={v.id} value={v.creator_id}>
                        {v.display_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Destination URL">
                <input
                  name="destination"
                  type="url"
                  required
                  defaultValue={modal.destination || p.destination}
                />
              </Field>
              <div className="form-grid">
                <Field label="Start date">
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={today()}
                    required
                  />
                </Field>
                <Field label="End date (optional)">
                  <input type="date" name="end_date" />
                </Field>
              </div>
              <div className="form-grid">
                <Field label="Cost in USD (optional)">
                  <input
                    type="number"
                    name="cost"
                    min="0"
                    step=".01"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Post / content identifier (optional)">
                  <input
                    name="content_id"
                    maxLength={160}
                    defaultValue={modal.content_id || ""}
                    placeholder="e.g. weekend-story"
                  />
                </Field>
              </div>
              <button className="button primary full" disabled={busy}>
                {busy ? "Creating…" : "Create campaign & link"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          {modal.type === "copy" && (
            <>
              <p>Select and copy the value below.</p>
              <textarea
                readOnly
                value={modal.value}
                rows={4}
                onFocus={(e) => e.target.select()}
              />
            </>
          )}
          {modal.type === "qr" && (
            <div className="qr-view">
              <img src={modal.data} alt={`QR code for ${modal.link.name}`} />
              <h3>{modal.link.name}</h3>
              <code>{modal.link.url}</code>
              <a
                className="button primary"
                href={modal.data}
                download={`${modal.link.slug}-qr.png`}
              >
                <Download size={16} />
                Download QR code
              </a>
            </div>
          )}
          {modal.type === "campaign-detail" && (
            <>
              <h3>{modal.campaign.name}</h3>
              <p className="muted">
                {modal.campaign.source} · creator-provided conversion reports
              </p>
              <div className="mini-metrics detail-metrics">
                {[
                  ["Visitors", num(modal.campaign.metrics.visitors)],
                  ["Clicks", num(modal.campaign.metrics.clicks)],
                  ["Conversions", num(modal.campaign.metrics.conversions)],
                  [
                    "Conversion rate",
                    pct(modal.campaign.metrics.conversionRate),
                  ],
                  ["Revenue", money(modal.campaign.metrics.revenue)],
                  ["Cost", money(modal.campaign.cost)],
                  [
                    "ROI",
                    modal.campaign.roi === null
                      ? "Not entered"
                      : pct(modal.campaign.roi),
                  ],
                ].map(([label, value]) => (
                  <Metric
                    key={label}
                    label={label}
                    value={value}
                    detail="Selected date range"
                  />
                ))}
              </div>
              <button
                className="button"
                onClick={() =>
                  copy(
                    state.links.find(
                      (l: any) => l.id === modal.campaign.link_id,
                    )?.url || "",
                  )
                }
              >
                <Copy size={16} />
                Copy tracking link
              </button>
            </>
          )}
          {modal.type === "compare" && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Visitors</th>
                    <th>Conversions</th>
                    <th>Rate</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {state.campaigns
                    .filter((c: any) => compare.includes(c.id))
                    .map((c: any) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{num(c.metrics.visitors)}</td>
                        <td>{c.metrics.conversions}</td>
                        <td>{pct(c.metrics.conversionRate)}</td>
                        <td>{money(c.metrics.revenue)}</td>
                        <td>{money(c.cost)}</td>
                        <td>{c.roi === null ? "—" : pct(c.roi)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {["swap", "counter"].includes(modal.type) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b: any = formData(e);
                perform(
                  () =>
                    api(
                      modal.type === "swap"
                        ? "/swaps"
                        : `/swaps/${modal.swap.id}/respond`,
                      "POST",
                      {
                        ...b,
                        peer_id: modal.peer?.creator_id,
                        action: "counter",
                      },
                    ),
                  modal.type === "swap"
                    ? "Swap request sent"
                    : "Counter proposal sent",
                );
              }}
            >
              <p className="muted">
                {modal.type === "swap"
                  ? `A mutual promotion with ${modal.peer.display_name}. Both creators receive their own attribution when accepted.`
                  : "Suggest a different start date or duration. Your partner can accept or decline."}
              </p>
              {modal.type === "swap" && (
                <div className="form-grid">
                  <Field label="Promotion type">
                    <select name="type">
                      {state.swap_types.map((v: string) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Platform">
                    <input
                      name="platform"
                      defaultValue={modal.peer.platform}
                      required
                    />
                  </Field>
                </div>
              )}
              <div className="form-grid">
                <Field label="Start date">
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={today()}
                    required
                  />
                </Field>
                <Field label="Duration (days)">
                  <input
                    type="number"
                    name="duration"
                    defaultValue={7}
                    min={1}
                    max={90}
                    required
                  />
                </Field>
              </div>
              <Field label="Note (optional)">
                <textarea
                  name="note"
                  maxLength={500}
                  rows={3}
                  placeholder="What would make this a great collaboration?"
                />
              </Field>
              <div className="info">
                <ShieldCheck size={18} />
                <span>
                  Send only consensual promotions. No subscriber identities are
                  shared.
                </span>
              </div>
              <button className="button primary full" disabled={busy}>
                {busy
                  ? "Sending…"
                  : modal.type === "swap"
                    ? "Send swap request"
                    : "Send counter proposal"}
                <Send size={16} />
              </button>
            </form>
          )}
          {modal.type === "swap-result" && (
            <>
              <div className="swap-result-heading">
                <h3>
                  {modal.swap.partner?.display_name} × {p.display_name}
                </h3>
                <Badge
                  tone={
                    modal.swap.fairness === "Balanced" ? "green" : "neutral"
                  }
                >
                  {modal.swap.fairness}
                </Badge>
              </div>
              <p className="muted">
                Aggregate results only. Fairness compares unique traffic
                received in each direction; conversion quality is shown
                separately.
              </p>
              <div className="swap-results">
                <div>
                  <h3>
                    <ArrowDownLeft size={18} />
                    Traffic you received
                  </h3>
                  <strong>{num(modal.swap.received?.visitors)}</strong>
                  <p>unique visitors</p>
                  <span>
                    {modal.swap.received?.conversions || 0} subscriber reports ·{" "}
                    {money(modal.swap.received?.revenue)}
                  </span>
                  <small>
                    {num(modal.swap.received?.clicks)} outbound clicks ·{" "}
                    {pct(modal.swap.received?.conversionRate)} conversion
                  </small>
                </div>
                <div>
                  <h3>
                    <ArrowUpRight size={18} />
                    Traffic you sent
                  </h3>
                  <strong>{num(modal.swap.sent?.visitors)}</strong>
                  <p>unique visitors</p>
                  <span>
                    {modal.swap.sent?.conversions || 0} subscriber reports ·{" "}
                    {money(modal.swap.sent?.revenue)}
                  </span>
                  <small>
                    {num(modal.swap.sent?.clicks)} outbound clicks ·{" "}
                    {pct(modal.swap.sent?.conversionRate)} conversion
                  </small>
                </div>
              </div>
              {modal.swap.share_url && (
                <div className="share-partner">
                  <p>
                    This is your partner’s link. Share it in your promotion.
                  </p>
                  <code>{modal.swap.share_url}</code>
                  <button
                    className="button"
                    onClick={() => copy(modal.swap.share_url)}
                  >
                    <Copy size={16} />
                    Copy partner link
                  </button>
                </div>
              )}
              {modal.swap.status === "accepted" && (
                <button
                  className="button full"
                  disabled={busy}
                  onClick={() =>
                    perform(
                      () =>
                        api(`/swaps/${modal.swap.id}/respond`, "POST", {
                          action: "complete",
                        }),
                      "Collaboration completed",
                    )
                  }
                >
                  Mark collaboration complete
                  <Check size={16} />
                </button>
              )}
            </>
          )}
          {modal.type === "peer-safety" && (
            <>
              <p>Manage your relationship with {modal.peer.display_name}.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const b = formData(e);
                  perform(
                    () =>
                      api("/reports", "POST", {
                        ...b,
                        peer_id: modal.peer.creator_id,
                      }),
                    "Report submitted for admin review",
                  );
                }}
              >
                <Field label="Report reason">
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="Describe the issue. Do not include subscriber identities."
                  />
                </Field>
                <button className="button full" disabled={busy}>
                  Submit report
                  <ShieldCheck size={16} />
                </button>
              </form>
              <button
                className="button danger full"
                disabled={busy}
                onClick={() =>
                  perform(
                    () =>
                      api(`/peers/${modal.peer.creator_id}/block`, "POST", {}),
                    "Creator blocked",
                  )
                }
              >
                Block creator
              </button>
            </>
          )}
          {modal.type === "conversion" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = formData(e);
                perform(
                  () => api("/conversions", "POST", b),
                  "Creator-provided conversion recorded",
                );
              }}
            >
              <div className="info">
                <CircleHelp size={19} />
                <span>
                  Only record a real conversion you can substantiate. This is a
                  creator-provided report, not an automatic platform sync.
                </span>
              </div>
              <Field
                label="Tracking link (optional)"
                hint="Without a link or recorded session, attribution is uncertain and won’t be credited to a campaign."
              >
                <select name="tracked_link_id">
                  <option value="">Unknown / unverified source</option>
                  {state.links.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Anonymous session ID (optional)"
                hint="A recorded session applies your selected first/last touch source. Never enter a subscriber’s identity."
              >
                <input name="session_id" placeholder="Anonymous session UUID" />
              </Field>
              <Field label="Revenue (USD)">
                <input
                  name="revenue"
                  type="number"
                  min={0}
                  step=".01"
                  defaultValue="0"
                  required
                />
              </Field>
              <Field
                label="Your conversion reference (optional)"
                hint="Used to prevent duplicate reports. No subscriber names or emails."
              >
                <input name="external_id" maxLength={100} />
              </Field>
              <button className="button primary full" disabled={busy}>
                {busy ? "Recording…" : "Record conversion"}
              </button>
            </form>
          )}
          {["privacy", "terms"].includes(modal.type) && (
            <Legal kind={modal.type} />
          )}
        </Modal>
      )}
    </div>
  );
}
function Account({ state, busy, perform, api, copy, setModal, logout }: any) {
  const [form, setForm] = useState({ ...state.profile }),
    [diagnostics, setDiagnostics] = useState<any>({});
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  useEffect(() => setForm({ ...state.profile }), [state.profile.platform]);
  const exportData = async () => {
    const d = await api("/export");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "naughty-pilot-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="account-layout">
      <section className="panel account-profile">
        <div className="panel-heading">
          <div>
            <h2>Your creator identity</h2>
            <p>The person behind your growth.</p>
          </div>
          <span className="avatar">{initials(form.display_name)}</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            perform(
              () =>
                api("/profile", "PUT", {
                  ...form,
                  current_subscribers:
                    form.current_subscribers === ""
                      ? null
                      : form.current_subscribers,
                }),
              "Profile saved",
              false,
            );
          }}
        >
          <div className="form-grid">
            <Field label="Display name">
              <input
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Niche">
              <input
                value={form.niche}
                onChange={(e) => set("niche", e.target.value)}
                maxLength={80}
                required
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Subscription platform">
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                required
              >
                {Array.from(
                  new Set([
                    "Subscription platform",
                    "OnlyFans",
                    "Fansly",
                    "Patreon",
                    "Pornhub",
                    "Other",
                    form.platform,
                  ]),
                ).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Current subscribers (self-reported)">
              <input
                type="number"
                min="0"
                value={form.current_subscribers ?? ""}
                placeholder="Not available"
                onChange={(e) => set("current_subscribers", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Creator destination URL">
            <input
              type="url"
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
              required
            />
          </Field>
          <Field label="Website URL">
            <input
              type="url"
              value={form.website || ""}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Audience tier (self-reported)">
              <select
                value={form.audience_tier}
                onChange={(e) => set("audience_tier", e.target.value)}
              >
                {["Under 1k", "1k–10k", "10k–50k", "50k+"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Country / region (optional)">
              <input
                value={form.region || ""}
                onChange={(e) => set("region", e.target.value)}
              />
            </Field>
          </div>
          <label className="checkline">
            <input
              type="checkbox"
              checked={form.discovery}
              onChange={(e) => set("discovery", e.target.checked)}
            />
            Show my profile in Peer Swap discovery.
          </label>
          <label className="checkline">
            <input
              type="checkbox"
              checked={form.show_region}
              onChange={(e) => set("show_region", e.target.checked)}
            />
            Display my region publicly.
          </label>
          <label className="checkline">
            <input
              type="checkbox"
              checked={form.availability !== false}
              onChange={(e) => set("availability", e.target.checked)}
            />
            Available for collaboration requests.
          </label>
          <Field label="Preferred promotion types">
            <div className="promotion-checks">
              {state.swap_types.map((v: string) => (
                <label className="checkline" key={v}>
                  <input
                    type="checkbox"
                    checked={form.promotion_types.includes(v)}
                    onChange={(e) =>
                      set(
                        "promotion_types",
                        e.target.checked
                          ? [...form.promotion_types, v]
                          : form.promotion_types.filter((t: string) => t !== v),
                      )
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
          </Field>
          <button className="button primary" disabled={busy}>
            Save profile
            <Check size={16} />
          </button>
        </form>
      </section>
      <SubscriberConnections
        state={state}
        busy={busy}
        perform={perform}
        setModal={setModal}
      />
      <section className="panel account-connections">
        <div className="panel-heading">
          <div>
            <h2>Connect accounts</h2>
            <p>Official APIs only. Honest connection status.</p>
          </div>
          <Globe size={19} />
        </div>
        <div className="connections-list">
          {state.providers
            .filter(
              (v: string) =>
                ![
                  "Website",
                  "Subscription platform",
                  "OnlyFans",
                  "Fansly",
                  "Patreon",
                  "Pornhub",
                ].includes(v),
            )
            .map((provider: string) => {
              const account = state.accounts.find(
                (a: any) => a.provider === provider,
              );
              return (
                <div key={provider}>
                  <span className="source-symbol">{provider[0]}</span>
                  <div>
                    <strong>{provider}</strong>
                    <small>
                      {account?.message ||
                        "Not connected · official API setup required"}
                    </small>
                    {account?.last_sync && (
                      <small>
                        Last attempt:{" "}
                        {new Date(account.last_sync).toLocaleString()}
                      </small>
                    )}
                  </div>
                  {account && account.status !== "disconnected" ? (
                    <div className="connection-actions">
                      <Badge>{account.status.replaceAll("_", " ")}</Badge>
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`Sync ${provider}`}
                        onClick={() =>
                          perform(
                            () =>
                              api(`/accounts/${account.id}/sync`, "POST", {}),
                            "Sync status updated",
                            false,
                          )
                        }
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`Disconnect ${provider}`}
                        onClick={() =>
                          perform(
                            () => api(`/accounts/${account.id}`, "DELETE"),
                            "Account disconnected",
                            false,
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="button small-button"
                      disabled={busy}
                      onClick={() =>
                        perform(
                          () =>
                            api("/accounts", "POST", {
                              provider,
                              url:
                                provider === "Subscription platform"
                                  ? form.destination
                                  : undefined,
                            }),
                          "Connection status checked",
                          false,
                        )
                      }
                    >
                      Check setup
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </section>
      <section className="panel website-panel">
        <div className="panel-heading">
          <div>
            <h2>Your website, connected.</h2>
            <p>Verify ownership. Install tracking. Test events.</p>
          </div>
          <Radio size={19} />
        </div>
        <form
          className="website-add"
          onSubmit={(e) => {
            e.preventDefault();
            const b = Object.fromEntries(
              new FormData(e.target as HTMLFormElement),
            );
            perform(
              () => api("/websites", "POST", b),
              "Website added. Verify your domain below.",
              false,
            );
          }}
        >
          <Field label="Website URL">
            <input
              name="url"
              type="url"
              placeholder="https://yourwebsite.com"
              required
              defaultValue={form.website || ""}
            />
          </Field>
          <button className="button" disabled={busy}>
            <Plus size={16} />
            Add website
          </button>
        </form>
        {state.websites.map((w: any) => {
          const base = location.origin;
          const script = `<script>window.NP_TRACKING_CONSENT = true;</script>\n<script async src="${base}/tracking.js" data-token="${w.token}"></script>`;
          return (
            <div className="website-config" key={w.id}>
              <div className="website-title">
                <h3>{w.domain}</h3>
                <Badge
                  tone={w.status === "receiving_events" ? "green" : "neutral"}
                >
                  {w.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <ol className="install-steps">
                <li>
                  <strong>Verify your domain with DNS</strong>
                  <p>
                    Add a TXT record named <code>_naughtypilot</code> with this
                    value:
                  </p>
                  <div className="code-box">
                    <code>np-verification={w.verification}</code>
                    <button
                      className="icon-button"
                      aria-label="Copy verification record"
                      onClick={() => copy(`np-verification=${w.verification}`)}
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                  <button
                    className="button small-button"
                    disabled={busy}
                    onClick={() =>
                      perform(
                        () => api(`/websites/${w.id}/verify`, "POST", {}),
                        "Domain verified",
                        false,
                      )
                    }
                  >
                    Check verification
                    <RefreshCw size={14} />
                  </button>
                </li>
                <li>
                  <strong>Install tracking after visitor consent</strong>
                  <p>
                    Set the consent flag only after permission is granted. Add
                    this script to your site. Mark subscription links with{" "}
                    <code>data-np-event="subscription_click"</code>.
                  </p>
                  <div className="code-box">
                    <code>{script}</code>
                    <button
                      className="icon-button"
                      aria-label="Copy website tracking script"
                      onClick={() => copy(script)}
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                </li>
                <li>
                  <strong>Test your connection</strong>
                  <p>
                    Open your website and grant tracking consent. Then check
                    whether events arrived.
                  </p>
                  <button
                    className="button small-button"
                    onClick={() =>
                      perform(
                        async () => {
                          const d = await api(
                            `/websites/${w.id}/test`,
                            "POST",
                            {},
                          );
                          setDiagnostics({ ...diagnostics, [w.id]: d });
                        },
                        "Diagnostics refreshed",
                        false,
                      )
                    }
                    disabled={busy}
                  >
                    Run diagnostics
                    <Radio size={14} />
                  </button>
                  {diagnostics[w.id] && (
                    <div className="info">
                      <AlertCircle size={18} />
                      <span>
                        {diagnostics[w.id].message}
                        <br />
                        Domain:{" "}
                        {diagnostics[w.id].verified
                          ? "verified"
                          : "not verified"}{" "}
                        · Script:{" "}
                        {diagnostics[w.id].installed
                          ? "events received"
                          : "not detected"}
                      </span>
                    </div>
                  )}
                </li>
              </ol>
            </div>
          );
        })}
      </section>
      <section className="panel privacy-panel">
        <div className="panel-heading">
          <div>
            <h2>Privacy, safety & your data</h2>
            <p>You’re in control.</p>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="privacy-actions">
          <button className="button" onClick={exportData}>
            <Download size={16} />
            Export my data
          </button>
          <button
            className="button"
            onClick={() => setModal({ type: "privacy" })}
          >
            Privacy & consent
          </button>
          <button
            className="button"
            onClick={() => setModal({ type: "terms" })}
          >
            Terms of service
          </button>
          <button
            className="button"
            onClick={() =>
              perform(
                async () => {
                  await api("/auth/logout", "POST", {});
                  logout();
                },
                "Signed out",
                false,
                false,
              )
            }
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
        {state.blocks.length > 0 && (
          <>
            <h3>Blocked creators</h3>
            {state.blocks.map((b: any) => (
              <div className="blocked-row" key={b.id}>
                <span>Creator {b.peer_id.slice(0, 8)}</span>
                <button
                  className="text-button"
                  onClick={() =>
                    perform(
                      () => api(`/peers/${b.peer_id}/block`, "DELETE"),
                      "Creator unblocked",
                      false,
                    )
                  }
                >
                  Unblock
                </button>
              </div>
            ))}
          </>
        )}
        <div className="danger-zone">
          <div>
            <strong>Delete your account</strong>
            <p>
              Permanently removes your account, tracking events, and campaign
              data.
            </p>
          </div>
          <button
            className="button danger"
            onClick={() => {
              if (
                confirm(
                  "Permanently delete your account and all your analytics data? This cannot be undone.",
                )
              )
                perform(
                  async () => {
                    await api("/account", "DELETE");
                    logout();
                  },
                  "Account deleted",
                  false,
                  false,
                );
            }}
          >
            Delete account
          </button>
        </div>
      </section>
      {state.development && (
        <section className="panel development-panel">
          <div>
            <Badge tone="accent">Development only</Badge>
            <h2>Explore the cockpit with sample events.</h2>
            <p>
              Simulated traffic and peer profiles are clearly labeled. They are
              never presented as your real results.
            </p>
          </div>
          <div className="privacy-actions">
            <button
              className="button"
              disabled={busy || state.has_demo}
              onClick={() =>
                perform(
                  () => api("/development/sample", "POST", {}),
                  "Labeled sample traffic loaded",
                  false,
                )
              }
            >
              <Radio size={16} />
              Load sample traffic
            </button>
            <button
              className="button"
              disabled={busy || !state.has_demo}
              onClick={() =>
                perform(
                  () => api("/development/sample", "DELETE"),
                  "Sample traffic cleared",
                  false,
                )
              }
            >
              Clear samples
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
function SubscriberConnections({ state, busy, perform, setModal }: any) {
  const [connecting, setConnecting] = useState(false),
    [connectionError, setConnectionError] = useState("");
  const setup = state.integration_setup?.Patreon || { configured: false };
  async function connect() {
    setConnecting(true);
    setConnectionError("");
    try {
      const result = await api("/oauth/patreon/start", "POST", {});
      location.assign(result.authorization_url);
    } catch (e: any) {
      setConnectionError(e.message);
      setConnecting(false);
    }
  }
  return (
    <section className="panel subscription-panel">
      <div className="panel-heading">
        <div>
          <h2>Your subscription platforms</h2>
          <p>
            Official subscriber counts where available. Creator-reported counts
            where they aren’t.
          </p>
        </div>
        <Users size={19} />
      </div>
      {connectionError && (
        <div className="inline-error" role="alert">
          {connectionError}
        </div>
      )}
      <div className="subscription-grid">
        {["OnlyFans", "Fansly", "Patreon", "Pornhub"].map((provider) => {
          const account = state.accounts.find(
              (a: any) => a.provider === provider,
            ),
            connected = account && account.status !== "disconnected",
            official = provider === "Patreon";
          const count = official
            ? account?.metrics?.current_subscribers
            : account?.manual_subscribers;
          const measured = official ? account?.last_sync : account?.reported_at;
          return (
            <article
              className="subscription-card"
              key={provider}
              aria-label={`${provider} subscriber connection`}
            >
              <div className="subscription-heading">
                <span className="source-symbol">{provider[0]}</span>
                <h3>{provider}</h3>
                <Badge
                  tone={
                    official && account?.status === "connected"
                      ? "green"
                      : "neutral"
                  }
                >
                  {official
                    ? account?.status === "connected"
                      ? "API connected"
                      : account?.status === "needs_reauthorization"
                        ? "Reconnect required"
                        : account?.status === "sync_error"
                          ? "Sync failed"
                          : "OAuth required"
                    : "Creator-reported"}
                </Badge>
              </div>
              <div className="subscriber-number">
                <strong>{count == null ? "—" : num(count)}</strong>
                <span>current paid subscribers</span>
              </div>
              <p>
                {official
                  ? account?.message ||
                    "Authorize your creator account through Patreon. Counts refresh about every five minutes."
                  : "Public creator page and counts you provide. Live subscriber syncing is not configured."}
              </p>
              {measured && (
                <small>
                  {official ? "Last successful sync" : "Reported"}:{" "}
                  {new Date(measured).toLocaleString()}
                </small>
              )}
              {official && account?.metrics && (
                <small>
                  {account.metrics.active_free_members} active free members ·
                  not included in paid count
                </small>
              )}
              <div className="subscription-actions">
                {official ? (
                  connected ? (
                    <>
                      <button
                        className="button small-button"
                        disabled={
                          busy || account.status === "needs_reauthorization"
                        }
                        onClick={() =>
                          perform(
                            () =>
                              api(`/accounts/${account.id}/sync`, "POST", {}),
                            "Patreon subscriber count synced",
                            false,
                          )
                        }
                      >
                        <RefreshCw size={14} />
                        Sync now
                      </button>
                      {account.status === "needs_reauthorization" && (
                        <button
                          className="button primary small-button"
                          disabled={connecting || !setup.configured}
                          onClick={connect}
                        >
                          Reconnect
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="button primary small-button"
                      disabled={connecting || !setup.configured}
                      onClick={connect}
                    >
                      {connecting ? "Opening Patreon…" : "Connect Patreon"}
                      <ExternalLink size={13} />
                    </button>
                  )
                ) : (
                  <button
                    className="button small-button"
                    disabled={busy}
                    onClick={() =>
                      setModal({ type: "subscription", provider, account })
                    }
                  >
                    <Plus size={14} />
                    {connected ? "Edit creator page" : "Add creator page"}
                  </button>
                )}
                {connected && (
                  <button
                    className="icon-button"
                    aria-label={`Disconnect ${provider}`}
                    disabled={busy}
                    onClick={() =>
                      perform(
                        () => api(`/accounts/${account.id}`, "DELETE"),
                        `${provider} disconnected`,
                        false,
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                )}
                {connected && state.profile.platform !== provider && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      perform(
                        () =>
                          api("/profile", "PUT", {
                            ...state.profile,
                            platform: provider,
                            destination:
                              account.url || state.profile.destination,
                          }),
                        `Primary subscriber platform changed to ${provider}`,
                        false,
                      )
                    }
                  >
                    Use on Home
                  </button>
                )}
              </div>
              {official && !setup.configured && (
                <details className="provider-setup">
                  <summary>Set up the Patreon OAuth app</summary>
                  <p>
                    Register a client in{" "}
                    <a
                      href="https://www.patreon.com/portal/registration/register-clients"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Patreon’s developer portal <ExternalLink size={11} />
                    </a>
                    . Set the server’s client ID and secret in environment
                    settings. No secrets belong in your browser or chat.
                  </p>
                  <p>Registered callback:</p>
                  <code>
                    {setup.callback_url ||
                      location.origin + "/api/cockpit/oauth/patreon/callback"}
                  </code>
                </details>
              )}
            </article>
          );
        })}
      </div>
      <div className="info">
        <CircleHelp size={18} />
        <span>
          Platform subscriber totals are separate from tracked campaign
          conversions. A new synced subscriber is never automatically credited
          to a campaign. Select your primary platform to show its count on Home.
        </span>
      </div>
    </section>
  );
}
function Admin() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/admin")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return error ? (
    <div className="panel">
      <Empty
        icon={ShieldCheck}
        title="Administrator access required"
        description={error}
      />
    </div>
  ) : data ? (
    <div className="panel">
      <h2>System health: {data.health}</h2>
      {data.controls && <FounderControls api={api} />}
      <div className="mini-metrics">
        <Metric
          label="Users"
          value={data.users.length}
          detail="Registered accounts"
        />
        <Metric label="Events" value={data.events} detail="Recorded volume" />
        <Metric
          label="Campaigns"
          value={data.campaigns}
          detail={`${data.swaps} swaps`}
        />
      </div>
      <h3>Reports ({data.reports.length})</h3>
      {data.reports.map((r: any) => (
        <p key={r.id}>{r.reason}</p>
      ))}
      <h3>Integration failures ({data.syncFailures.length})</h3>
      {data.syncFailures.map((s: any) => (
        <p key={s.id}>{s.message}</p>
      ))}
    </div>
  ) : (
    <p>Loading admin health…</p>
  );
}
