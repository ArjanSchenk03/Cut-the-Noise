import { useEffect, useState, type FormEvent } from "react";
import {
  createActivity,
  deleteDeal,
  listActivities,
  moveDealStage,
  recalcGrip,
  setActivityDone,
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
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ctn-gold focus:outline-none";
const ACTIVITY_TYPES: ActivityType[] = ["belletje", "afspraak", "offerte", "followup", "notitie"];

function nextStage(stage: DealStage): DealStage | null {
  const i = PIPELINE_STAGES.indexOf(stage);
  if (i === -1 || i >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[i + 1];
}

export default function DealDrawer({
  deal,
  accountName,
  onClose,
  onChange,
  onDeleted,
}: {
  deal: Deal;
  accountName?: string | null;
  onClose: () => void;
  onChange: (d: Deal) => void; // laat de aanroepende pagina zijn state bijwerken
  onDeleted?: (id: string) => void; // verwijdert de deal uit de aanroepende lijst
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ActivityType>("belletje");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState(""); // deadline (yyyy-mm-dd)
  const [busy, setBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Bewerken van de dealgegevens
  const [editing, setEditing] = useState(false);
  const [eTitle, setETitle] = useState(deal.title);
  const [eAmount, setEAmount] = useState(deal.amount != null ? String(deal.amount) : "");
  const [eClose, setEClose] = useState(deal.expected_close_date ?? "");

  const startEdit = () => {
    setETitle(deal.title);
    setEAmount(deal.amount != null ? String(deal.amount) : "");
    setEClose(deal.expected_close_date ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    setError(null);
    try {
      const updated = await updateDeal(deal.id, {
        title: eTitle.trim(),
        amount: eAmount ? Number(eAmount) : null,
        expected_close_date: eClose || null,
      });
      onChange(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmDelete = async () => {
    setError(null);
    try {
      await deleteDeal(deal.id);
      onDeleted?.(deal.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    listActivities(deal.id)
      .then(setActivities)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deal.id]);

  const changeStage = async (stage: DealStage) => {
    setError(null);
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
        due_at: due ? new Date(due).toISOString() : null,
      });
      setActivities((prev) => [a, ...prev]);
      setNotes("");
      setDue("");
      await doRecalcGrip(); // nieuwe activiteit verfrist 'last_activity_at' → GRIP omhoog
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (a: Activity) => {
    try {
      await setActivityDone(a.id, !a.done);
      setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmLost = async () => {
    setError(null);
    try {
      const updated = await updateDeal(deal.id, {
        stage: "verloren",
        lost_reason: lostReason.trim() || null,
      });
      onChange(updated); // aanroeper verwijdert de deal uit het bord
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const next = nextStage(deal.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ctn-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold">{deal.title}</h2>
            <p className="text-sm text-slate-500">
              {accountName ? `${accountName} · ` : ""}
              {eur.format(deal.amount ?? 0)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={startEdit}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ctn-gold hover:bg-ctn-sand"
              title="Deal bewerken"
            >
              ✎ Bewerken
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
              aria-label="Sluiten"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {editing && (
            <div className="space-y-2 rounded-xl border border-ctn-gold/50 bg-ctn-sand p-3">
              <p className="text-sm font-semibold">Deal bewerken</p>
              <label className="block text-xs font-medium text-slate-600">
                Titel
                <input className={input} value={eTitle} onChange={(e) => setETitle(e.target.value)} />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Bedrag (€)
                <input className={input} type="number" min={0} value={eAmount} onChange={(e) => setEAmount(e.target.value)} />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Verwachte sluitdatum
                <input className={input} type="date" value={eClose} onChange={(e) => setEClose(e.target.value)} />
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 rounded-lg bg-ctn-gold px-3 py-2 text-sm font-semibold text-ctn-black hover:bg-ctn-goldlight"
                >
                  Opslaan
                </button>
              </div>
            </div>
          )}

          {/* Fase + volgende-fase-knop */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fase
            </label>
            <div className="flex gap-2">
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
              {next && (
                <button
                  onClick={() => changeStage(next)}
                  className="shrink-0 rounded-lg bg-ctn-black px-3 py-2 text-sm font-semibold text-ctn-offwhite hover:bg-black"
                  title={`Naar ${STAGE_LABELS[next]}`}
                >
                  → {STAGE_LABELS[next]}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-ctn-sand px-3 py-2">
            <span className="text-sm">
              GRIP-score: <strong>{deal.grip_score ?? 0}%</strong>
            </span>
            <button onClick={doRecalcGrip} className="text-xs font-semibold text-ctn-gold hover:underline">
              Herbereken
            </button>
          </div>

          {/* Activiteit / taak toevoegen */}
          <form onSubmit={addActivity} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Activiteit of taak</p>
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
            <label className="block text-xs font-medium text-slate-500">
              Deadline (optioneel) — met deadline verschijnt het als taak op de Acties-pagina
              <input className={input} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ctn-gold px-3 py-2 text-sm font-semibold text-ctn-black hover:bg-ctn-goldlight disabled:opacity-60"
            >
              {busy ? "Bezig…" : "Toevoegen"}
            </button>
          </form>

          {/* Tijdlijn */}
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
                      <span className={`font-medium ${a.done ? "text-slate-400 line-through" : ""}`}>
                        {ACTIVITY_LABELS[a.type]}
                      </span>
                      {a.due_at ? (
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={a.done} onChange={() => toggleDone(a)} />
                          <span className={a.done ? "text-slate-400" : "font-semibold text-red-600"}>
                            deadline {new Date(a.due_at).toLocaleDateString("nl-NL")}
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {new Date(a.occurred_at).toLocaleString("nl-NL")}
                        </span>
                      )}
                    </div>
                    {a.notes && <p className="mt-1 text-slate-600">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="border-t border-slate-200 p-4">
          {lostOpen ? (
            <div className="space-y-2">
              <textarea
                className={input}
                rows={2}
                placeholder="Reden van verlies (optioneel)"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setLostOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmLost}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Bevestig verloren
                </button>
              </div>
            </div>
          ) : deleteOpen ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Deze deal <strong>definitief verwijderen</strong>? Dit kan niet ongedaan
                worden gemaakt. Gebruik dit voor foutjes; "verloren" is voor deals die je
                echt niet wint.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setLostOpen(true)}
                className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Markeer verloren
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Verwijderen
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
