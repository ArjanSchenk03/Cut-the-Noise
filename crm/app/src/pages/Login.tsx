import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  const input =
    "mt-1 w-full rounded-lg border border-ctn-line bg-white px-3 py-2 text-sm focus:border-ctn-gold focus:outline-none";

  return (
    <div className="grid min-h-screen place-items-center bg-ctn-black px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-ctn-offwhite p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ctn-black">
            CTN<span className="text-ctn-gold">.</span>CRM
          </h1>
          <p className="mt-1 text-sm text-ctn-gray">Van lead naar order — zonder ruis.</p>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wider text-ctn-gray">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            placeholder="jij@bedrijf.nl"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wider text-ctn-gray">
          Wachtwoord
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-ctn-gold px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-ctn-black hover:bg-ctn-goldlight disabled:opacity-60"
        >
          {busy ? "Bezig…" : "Inloggen"}
        </button>
      </form>
    </div>
  );
}
