import { useEffect, useMemo, useState } from "react";
import { getFunnelStats, type FunnelStats } from "../lib/api";

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

// Fallback-richtcijfers wanneer er nog geen eigen data is.
const DEFAULTS = { x: 30, y: 50, z: 40 };

export default function Dashboard() {
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFunnelStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Dashboard laden…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">XYZ-dashboard</h1>

      <FunnelSection stats={stats} />
      <RatioSection stats={stats} />
      <Calculator stats={stats} />
    </div>
  );
}

/* ---------- Funnel ---------- */
function FunnelSection({ stats }: { stats: FunnelStats }) {
  const rows = [
    { label: "Leads", value: stats.leads },
    { label: "Afspraken", value: stats.afspraken },
    { label: "Offertes", value: stats.offertes },
    { label: "Orders", value: stats.orders },
  ];
  const max = Math.max(1, stats.leads);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Funnel</h2>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-24 text-sm text-slate-600">{r.label}</span>
            <div className="h-7 flex-1 rounded-lg bg-slate-100">
              <div
                className={`flex h-7 items-center rounded-lg px-2 text-xs font-semibold text-white ${
                  ["bg-slate-400", "bg-sky-500", "bg-indigo-500", "bg-green-500"][i]
                }`}
                style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }}
              >
                {r.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Ratio-kaarten ---------- */
function RatioSection({ stats }: { stats: FunnelStats }) {
  const cards = [
    { k: "X", label: "Afspraak-ratio", sub: "afspraken ÷ leads", val: stats.x },
    { k: "Y", label: "Offerte-ratio", sub: "offertes ÷ afspraken", val: stats.y },
    { k: "Z", label: "Order-ratio", sub: "orders ÷ offertes", val: stats.z },
  ];
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Conversieratio's</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-indigo-600">{c.k}</span>
              <span className="text-2xl font-bold">{pct(c.val)}</span>
            </div>
            <p className="mt-1 text-sm font-medium">{c.label}</p>
            <p className="text-xs text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Terugreken-calculator ---------- */
function Calculator({ stats }: { stats: FunnelStats }) {
  const [target, setTarget] = useState("5");
  const [x, setX] = useState(String(stats.x != null ? Math.round(stats.x * 100) : DEFAULTS.x));
  const [y, setY] = useState(String(stats.y != null ? Math.round(stats.y * 100) : DEFAULTS.y));
  const [z, setZ] = useState(String(stats.z != null ? Math.round(stats.z * 100) : DEFAULTS.z));

  const result = useMemo(() => {
    const orders = Number(target) || 0;
    const xr = Number(x) / 100;
    const yr = Number(y) / 100;
    const zr = Number(z) / 100;
    if (orders <= 0 || xr <= 0 || yr <= 0 || zr <= 0) return null;
    const offertes = orders / zr;
    const afspraken = offertes / yr;
    const leads = afspraken / xr;
    return {
      offertes: Math.ceil(offertes),
      afspraken: Math.ceil(afspraken),
      leads: Math.ceil(leads),
    };
  }, [target, x, y, z]);

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Terugreken-calculator</h2>
      <p className="mb-3 text-sm text-slate-500">
        Hoeveel activiteit is nodig voor je orderdoel? Ratio's zijn vooringevuld met je eigen
        cijfers — pas ze gerust aan.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block text-sm font-medium">
            Orderdoel
            <input className={field} type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            X: afspraak %
            <input className={field} type="number" min={0} max={100} value={x} onChange={(e) => setX(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Y: offerte %
            <input className={field} type="number" min={0} max={100} value={y} onChange={(e) => setY(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Z: order %
            <input className={field} type="number" min={0} max={100} value={z} onChange={(e) => setZ(e.target.value)} />
          </label>
        </div>

        {result ? (
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Leads nodig" value={result.leads} />
            <Stat label="Afspraken nodig" value={result.afspraken} />
            <Stat label="Offertes nodig" value={result.offertes} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Vul een orderdoel en ratio's groter dan 0 in om de benodigde activiteit te zien.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-2xl font-bold text-indigo-600">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
