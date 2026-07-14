import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createDeal, listAccounts, listDeals } from "../lib/api";
import { STAGE_LABELS, type Account, type Deal } from "../lib/types";
import DealDrawer from "../components/DealDrawer";

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ctn-gold focus:outline-none";

function gripColor(score: number | null): string {
  const s = score ?? 0;
  if (s >= 70) return "bg-green-100 text-green-800";
  if (s >= 40) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function Deals() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Deal | null>(null);

  // formulier
  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listAccounts(), listDeals({ includeLost: true })])
      .then(([a, d]) => {
        setAccounts(a);
        setDeals(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const accountName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );

  const applyDeal = (updated: Deal) => {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError("Kies eerst een account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const d = await createDeal({
        account_id: accountId,
        title: title.trim(),
        amount: amount ? Number(amount) : null,
        expected_close_date: closeDate || null,
      });
      setDeals((prev) => [d, ...prev]);
      setTitle("");
      setAmount("");
      setCloseDate("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-slate-500">Deals laden…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deals</h1>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      {/* Nieuwe deal aanmaken */}
      <section className="rounded-xl border border-ctn-line bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Nieuwe potentiële deal</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">
            Maak eerst een account aan op het tabblad <strong>Accounts</strong>.
          </p>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Account *
              <select
                className={input}
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">— kies account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Titel * <span className="text-slate-400">(bijv. "Sales programma")</span>
              <input className={input} required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Bedrag (€)
              <input className={input} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Verwachte sluitdatum
              <input className={input} type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-ctn-gold px-4 py-2 text-sm font-semibold text-ctn-black hover:bg-ctn-goldlight disabled:opacity-60"
              >
                {busy ? "Bezig…" : "Deal aanmaken"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Alle deals */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Alle deals</h2>
        {deals.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen deals.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Deal</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Fase</th>
                  <th className="px-4 py-2 text-right font-medium">Bedrag</th>
                  <th className="px-4 py-2 text-right font-medium">GRIP</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 font-medium">{d.title}</td>
                    <td className="px-4 py-2 text-slate-600">{accountName.get(d.account_id) ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {STAGE_LABELS[d.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{eur.format(d.amount ?? 0)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gripColor(d.grip_score)}`}>
                        {d.grip_score ?? 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <DealDrawer
          deal={selected}
          accountName={accountName.get(selected.account_id) ?? null}
          onClose={() => setSelected(null)}
          onChange={applyDeal}
          onDeleted={(id) => setDeals((ds) => ds.filter((d) => d.id !== id))}
        />
      )}
    </div>
  );
}
