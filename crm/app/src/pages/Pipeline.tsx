import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { PIPELINE_STAGES, STAGE_LABELS, type Deal, type DealStage } from "../lib/types";

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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .neq("stage", "verloren")
        .order("updated_at", { ascending: false });

      if (error) setError(error.message);
      else setDeals((data ?? []) as Deal[]);
      setLoading(false);
    })();
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    for (const s of PIPELINE_STAGES) map.set(s, []);
    for (const d of deals) map.get(d.stage)?.push(d);
    return map;
  }, [deals]);

  if (loading) return <p className="text-slate-500">Pipeline laden…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-slate-500">{deals.length} lopende deals</p>
      </div>

      {deals.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen deals. Voeg je eerste account + deal toe (komt in Fase 2), of
          maak testdata aan in Supabase.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const total = items.reduce((sum, d) => sum + (d.amount ?? 0), 0);
          return (
            <div key={stage} className="rounded-xl bg-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <p className="mb-3 text-xs text-slate-500">{eur.format(total)}</p>

              <div className="space-y-2">
                {items.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-sm font-medium">{d.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {eur.format(d.amount ?? 0)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gripColor(
                          d.grip_score
                        )}`}
                        title="GRIP-score"
                      >
                        {d.grip_score ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
