import { useEffect, useMemo, useState, type DragEvent } from "react";
import { listDeals, moveDealStage } from "../lib/api";
import { PIPELINE_STAGES, STAGE_LABELS, type Deal, type DealStage } from "../lib/types";
import DealDrawer from "../components/DealDrawer";

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function gripColor(score: number | null): string {
  const s = score ?? 0;
  if (s >= 70) return "bg-green-100 text-green-800";
  if (s >= 40) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DealStage | null>(null);
  const [selected, setSelected] = useState<Deal | null>(null);

  useEffect(() => {
    listDeals()
      .then(setDeals)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    for (const s of PIPELINE_STAGES) map.set(s, []);
    for (const d of deals) map.get(d.stage)?.push(d);
    return map;
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

  const onDrop = async (stage: DealStage) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const current = deals.find((d) => d.id === id);
    if (!current || current.stage === stage) return;

    // Optimistisch verplaatsen; bij fout terugdraaien.
    const prev = current.stage;
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage } : d)));
    try {
      const updated = await moveDealStage(id, stage);
      applyDeal(updated);
    } catch (e) {
      setError((e as Error).message);
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: prev } : d)));
    }
  };

  if (loading) return <p className="text-slate-500">Pipeline laden…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-slate-500">{deals.length} lopende deals</p>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const total = items.reduce((sum, d) => sum + (d.amount ?? 0), 0);
          return (
            <div
              key={stage}
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
              onDrop={() => onDrop(stage)}
              className={`rounded-xl p-3 transition-colors ${
                dragOver === stage ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-100"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <p className="mb-3 text-xs text-slate-500">{eur.format(total)}</p>

              <div className="space-y-2">
                {items.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setSelected(d)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-300"
                  >
                    <p className="text-sm font-medium">{d.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{eur.format(d.amount ?? 0)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gripColor(d.grip_score)}`}
                        title="GRIP-score"
                      >
                        {d.grip_score ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-300 py-4 text-center text-xs text-slate-400">
                    Sleep hierheen
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <DealDrawer deal={selected} onClose={() => setSelected(null)} onChange={applyDeal} />
      )}
    </div>
  );
}
