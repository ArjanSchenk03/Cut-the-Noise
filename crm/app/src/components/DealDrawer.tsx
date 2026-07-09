import { useEffect, useState, type FormEvent } from "react";
import {
  createActivity,
  listActivities,
  moveDealStage,
  recalcGrip,
  updateDeal,
} from "../lib/api";
import {
  ACTIVITY_LABELS,
  PIPELINE_STAGES,
  STAGE_LABELS,
  type Activity,
  type ActivityType,
  type Deal,
  type DealStage,
} from "../lib/types";

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const ACTIVITY_TYPES: ActivityType[] = ["belletje", "afspraak", "offerte", "followup", "notitie"];

export default function DealDrawer({
  deal,
  onClose,
  onChange,
}: {
  deal: Deal;
  onClose: () => void;
  onChange: (d: Deal) => void; // laat de pipeline zijn state bijwerken
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ActivityType>("belletje");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listActivities(deal.id)
      .then(setActivities)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deal.id]);

  const changeStage = async (stage: DealStage) => {
    try {
      const updated = await moveDealStage(deal.id, stage);
      onChange(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const doRecalcGrip = async () => {
    try {
      const score = await recalcGrip(deal.id);
      onChange({ ...deal, grip_score: score });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addActivity = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const a = await createActivity({
        deal_id: deal.id,
        account_id: deal.account_id,
        type,
        notes: notes.trim() || null,
      });
      setActivities((prev) => [a, ...prev]);
      setNotes("");
      // Activiteit ververst 'last_activity_at' → GRIP opnieuw berekenen.
      await doRecalcGrip();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markLost = async () => {
    const reason = window.prompt("Reden van verlies?") ?? undefined;
    try {
      const updated = await updateDeal(deal.id, { stage: "verloren", lost_reason: reason ?? null });
      onChange(updated);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold">{deal.title}</h2>
            <p className="text-sm text-slate-500">{eur.format(deal.amount ?? 0)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
            aria-label="Sluiten"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Fase</label>
            <select
              className={input}
              value={deal.stage === "verloren" ? "lead" : deal.stage}
              onChange={(e) => changeStage(e.target.value as DealStage)}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm">
              GRIP-score: <strong>{deal.grip_score ?? 0}%</strong>
            </span>
            <button onClick={doRecalcGrip} className="text-xs font-medium text-indigo-600 hover:underline">
              Herbereken
            </button>
          </div>

          {/* Activiteit toevoegen */}
          <form onSubmit={addActivity} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Activiteit loggen</p>
            <select className={input} value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_LABELS[t]}
                </option>
              ))}
            </select>
            <textarea
              className={input}
              rows={2}
              placeholder="Notitie (optioneel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Bezig…" : "Toevoegen"}
            </button>
          </form>

          {/* Timeline */}
          <div>
            <p className="mb-2 text-sm font-semibold">Tijdlijn</p>
            {loading ? (
              <p className="text-sm text-slate-500">Laden…</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500">Nog geen activiteiten.</p>
            ) : (
              <ul className="space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{ACTIVITY_LABELS[a.type]}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(a.occurred_at).toLocaleString("nl-NL")}
                      </span>
                    </div>
                    {a.notes && <p className="mt-1 text-slate-600">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-200 p-4">
          <button
            onClick={markLost}
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Markeer als verloren
          </button>
        </footer>
      </aside>
    </div>
  );
}
