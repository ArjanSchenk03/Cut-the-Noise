import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { accountNameMap, listDeals, moveDealStage, recalcAllGrip } from "../lib/api";
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
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Verse GRIP-scores bij het laden; valt terug op een gewone lijst als
    // recalc_all_grip() nog niet in de database staat (upgrade-fase4.sql).
    (async () => {
      try {
        setAccountNames(await accountNameMap());
      } catch {
        /* accountnamen zijn optioneel voor weergave */
      }
      try {
        setDeals(await recalcAllGrip());
      } catch {
        try {
          setDeals(await listDeals());
        } catch (e) {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    })();
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

  // Verplaats een deal naar een specifieke fase (optimistisch, met terugdraaien).
  const move = async (id: string, from: DealStage, to: DealStage) => {
    if (from === to) return;
    setError(null);
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: to } : d)));
    try {
      const updated = await moveDealStage(id, to);
      applyDeal(updated);
    } catch (e) {
      setError((e as Error).message);
      setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: from } : d)));
    }
  };

  const onDrop = (stage: DealStage) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const current = deals.find((d) => d.id === id);
    if (current) move(id, current.stage, stage);
  };

  // Eén fase vooruit/terug via de pijltjes op de kaart.
  const step = (d: Deal, delta: number) => {
    const i = PIPELINE_STAGES.indexOf(d.stage);
    const ni = i + delta;
    if (i < 0 || ni < 0 || ni >= PIPELINE_STAGES.length) return;
    move(d.id, d.stage, PIPELINE_STAGES[ni]);
  };

  if (loading) return <p className="text-slate-500">Pipeline laden…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-slate-500">{deals.length} lopende deals</p>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      {deals.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen deals om te slepen. Maak er eerst een aan via{" "}
          <Link to="/accounts" className="font-medium text-ctn-gold hover:underline">
            Accounts
          </Link>
          {" "}→ open een account → <strong>+ Nieuwe deal</strong>. De deal verschijnt dan
          als kaartje in de kolom <strong>Lead</strong>, die je hierheen kunt slepen.
        </div>
      )}

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
                dragOver === stage ? "bg-ctn-sand ring-2 ring-ctn-gold" : "bg-slate-100"
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
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-ctn-gold"
                  >
                    <p className="text-sm font-medium">{d.title}</p>
                    {accountNames.get(d.account_id) && (
                      <p className="text-xs text-ctn-gray">{accountNames.get(d.account_id)}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{eur.format(d.amount ?? 0)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gripColor(d.grip_score)}`}
                        title="GRIP-score"
                      >
                        {d.grip_score ?? 0}%
                      </span>
                    </div>
                    {/* Zelf verschuiven zonder slepen */}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          step(d, -1);
                        }}
                        disabled={PIPELINE_STAGES.indexOf(d.stage) === 0}
                        className="rounded px-2 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Vorige fase"
                      >
                        ← terug
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          step(d, 1);
                        }}
                        disabled={PIPELINE_STAGES.indexOf(d.stage) === PIPELINE_STAGES.length - 1}
                        className="rounded px-2 py-0.5 text-xs font-semibold text-ctn-gold hover:bg-ctn-sand disabled:opacity-30"
                        title="Volgende fase"
                      >
                        verder →
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && dragId && (
                  <p className="rounded-lg border border-dashed border-ctn-gold py-4 text-center text-xs text-ctn-gold">
                    Sleep hierheen
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <DealDrawer
          deal={selected}
          accountName={accountNames.get(selected.account_id) ?? null}
          onClose={() => setSelected(null)}
          onChange={applyDeal}
        />
      )}
    </div>
  );
}
