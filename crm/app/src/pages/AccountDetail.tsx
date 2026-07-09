import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { createContact, getAccount, listContacts, listDealsForAccount } from "../lib/api";
import {
  CONTACT_ROLE_LABELS,
  STAGE_LABELS,
  type Account,
  type Contact,
  type ContactRole,
  type Deal,
} from "../lib/types";
import Modal from "../components/Modal";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ctn-gold focus:outline-none";
const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getAccount(id), listContacts(id), listDealsForAccount(id)])
      .then(([a, c, d]) => {
        setAccount(a);
        setContacts(c);
        setDeals(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Laden…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;
  if (!account) return <p className="text-slate-500">Account niet gevonden.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/accounts" className="text-sm text-ctn-gold hover:underline">
          ← Accounts
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{account.name}</h1>
        <p className="text-sm text-slate-500">
          {[account.industry, account.source && `bron: ${account.source}`, account.icp_match != null && `ICP ${account.icp_match}%`]
            .filter(Boolean)
            .join(" · ") || "Geen extra gegevens"}
        </p>
      </div>

      {/* Contacten */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacten</h2>
          <button
            onClick={() => setContactOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            + Contact
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen contacten.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  <span className="font-medium">{c.name}</span>
                  {c.email && <span className="text-slate-500"> · {c.email}</span>}
                  {c.phone && <span className="text-slate-500"> · {c.phone}</span>}
                </span>
                {c.role && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {CONTACT_ROLE_LABELS[c.role]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Deals (alleen-lezen; aanmaken gebeurt op het Deals-tabblad) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deals</h2>
          <Link
            to="/deals"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Deal aanmaken →
          </Link>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nog geen deals. Maak er een aan op het tabblad <strong>Deals</strong>.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium">{d.title}</span>
                <span className="flex items-center gap-3 text-slate-500">
                  <span>{eur.format(d.amount ?? 0)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {STAGE_LABELS[d.stage]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {contactOpen && (
        <NewContactModal
          accountId={account.id}
          onClose={() => setContactOpen(false)}
          onCreated={(c) => {
            setContacts((prev) => [...prev, c]);
            setContactOpen(false);
          }}
        />
      )}
    </div>
  );
}

const ROLES: ContactRole[] = ["beslisser", "beinvloeder", "gebruiker", "gatekeeper"];

function NewContactModal({
  accountId,
  onClose,
  onCreated,
}: {
  accountId: string;
  onClose: () => void;
  onCreated: (c: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ContactRole | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const c = await createContact({
        account_id: accountId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        role: role || null,
      });
      onCreated(c);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Nieuw contact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          Naam *
          <input className={input} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          E-mail
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Telefoon
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Rol
          <select className={input} value={role} onChange={(e) => setRole(e.target.value as ContactRole | "")}>
            <option value="">—</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ModalActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ModalActions({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
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
  );
}
