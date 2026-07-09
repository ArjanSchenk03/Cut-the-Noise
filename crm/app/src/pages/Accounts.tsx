import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createAccount, listAccounts } from "../lib/api";
import type { Account } from "../lib/types";
import Modal from "../components/Modal";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ctn-gold focus:outline-none";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Accounts laden…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-ctn-gold px-3 py-2 text-sm font-semibold text-ctn-black hover:bg-ctn-goldlight"
        >
          + Nieuw account
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen accounts. Maak je eerste account aan.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Naam</th>
                <th className="px-4 py-2 font-medium">Branche</th>
                <th className="px-4 py-2 font-medium">Bron</th>
                <th className="px-4 py-2 font-medium">ICP-match</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">
                    <Link to={`/accounts/${a.id}`} className="text-ctn-gold hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{a.industry ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{a.source ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {a.icp_match != null ? `${a.icp_match}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <NewAccountModal
          onClose={() => setOpen(false)}
          onCreated={(acc) => {
            setAccounts((prev) => [acc, ...prev]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NewAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: Account) => void;
}) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [icp, setIcp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const acc = await createAccount({
        name: name.trim(),
        industry: industry.trim() || null,
        source: source.trim() || null,
        icp_match: icp ? Number(icp) : null,
      });
      onCreated(acc);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Nieuw account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          Naam *
          <input className={input} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Branche
          <input className={input} value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Lead-bron
          <input className={input} value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          ICP-match (0–100)
          <input
            className={input}
            type="number"
            min={0}
            max={100}
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-ctn-gold px-3 py-2 text-sm font-semibold text-ctn-black hover:bg-ctn-goldlight disabled:opacity-60"
          >
            {busy ? "Bezig…" : "Aanmaken"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
