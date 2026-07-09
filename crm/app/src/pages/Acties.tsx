import { useEffect, useMemo, useState } from "react";
import { listDeals } from "../lib/api";
import { STAGE_LABELS, type Deal } from "../lib/types";
import DealDrawer from "../components/DealDrawer";

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const STALE_DAYS = 7; // na zoveel dagen zonder activiteit geldt een deal als 'stil'
const DAY_MS = 86_400_000;

type ReasonKind = "stil" | "deadline" | "grip";

interface Reason {
  kind: ReasonKind;
  label: string;
  weight: number; // bepaalt de sortering (urgentie)
}

const REASON_STYLE: Record<ReasonKind, string> = {
  stil: "bg-amber-100 text-amber-800",
  deadline: "bg-red-100 text-red-800",
  grip: "bg-green-100 text-green-800",
};

function reasonsFor(d: Deal, now: number): Reason[] {
  const rs: Reason[] = [];

  const last = Date.parse(d.last_activity_at ?? d.created_at);
  const staleDays = Math.floor((now - last) / DAY_MS);
  if (staleDays >= STALE_DAYS) {
    rs.push({ kind: "stil", label: `${staleDays} dgn geen activiteit`, weight: 2 + staleDays / 30 });
  }

  if (d.expected_close_date) {
    const daysLeft = Math.ceil((Date.parse(d.expected_close_date) - now) / DAY_MS);
    if (daysLeft < 0) {
      rs.push({ kind: "deadline", label: `${-daysLeft} dgn over sluitdatum`, weight: 3 });
    } else if (daysLeft <= 7) {
      rs.push({ kind: "deadline", label: `sluit over ${daysLeft} dgn`, weight: 2.5 });
    }
  }

  if ((d.grip_score ?? 0) >= 70) {
    rs.push({ kind: "grip", label: "hoge GRIP — pak door", weight: 2 });
  }

  return rs;
}

export default function Acties() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Deal | null>(null);

  useEffect(() => {
    listDeals()
      .then(setDeals)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    const now = Date.now();
    return deals
      .filter((d) => d.stage !== "order_won") // gewonnen deals hebben geen actie nodig
      .map((deal) => ({ deal, reasons: reasonsFor(deal, now) }))
      .filter((it) => it.reasons.length > 0)
      .sort(
        (a, b) =>
          b.reasons.reduce((s, r) => s + r.weight, 0) -
          a.reasons.reduce((s, r) => s + r.weight, 0)
      );
  }, [deals]);

  // Werk één deal bij in de lokale state (of verwijder als 'verloren').
  const applyDeal = (updated: Deal) => {
    setDeals((prev) =>
      updated.stage === "verloren"
        ? prev.filter((d) => d.id !== updated.id)
        : prev.map((d) => (d.id === updated.id ? updated : d))
    );
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur));
  };

  if (loading) return <p className="text-slate-500">Acties laden…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Acties</h1>
        <p className="text-sm text-slate-500">{items.length} deals vragen aandacht</p>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Deals die stilvallen, waarvan de sluitdatum nadert, of waar je juist moet
        doorpakken. Klik een deal om direct een activiteit te loggen.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Geen openstaande acties — alles is opgevolgd. 🎉
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map(({ deal, reasons }) => (
            <li
              key={deal.id}
              onClick={() => setSelected(deal)}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium">{deal.title}</p>
                <p className="text-xs text-slate-500">
                  {STAGE_LABELS[deal.stage]} · {eur.format(deal.amount ?? 0)} · GRIP{" "}
                  {deal.grip_score ?? 0}%
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reasons.map((r) => (
                  <span
                    key={r.kind}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REASON_STYLE[r.kind]}`}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <DealDrawer deal={selected} onClose={() => setSelected(null)} onChange={applyDeal} />
      )}
    </div>
  );
}
