import { useEffect, useState } from "react";
import { getTeamFunnelStats, type OwnerFunnel } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

// Bepaal het zwakste conversiepunt (X/Y/Z) van een verkoper = coaching-focus.
function focusPoint(o: OwnerFunnel): { label: string; ratio: number } | null {
  const options = [
    { key: "x" as const, label: "Afspraken maken (X)", ratio: o.stats.x },
    { key: "y" as const, label: "Offertes uitbrengen (Y)", ratio: o.stats.y },
    { key: "z" as const, label: "Deals sluiten (Z)", ratio: o.stats.z },
  ].filter((r): r is { key: "x" | "y" | "z"; label: string; ratio: number } => r.ratio != null);
  if (options.length === 0) return null;
  return options.reduce((min, r) => (r.ratio < min.ratio ? r : min));
}

export default function Team() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<OwnerFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isManager) {
      setLoading(false);
      return;
    }
    getTeamFunnelStats()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isManager]);

  if (!isManager) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Deze pagina is alleen voor managers. Vraag een beheerder om je rol op{" "}
        <code className="rounded bg-slate-100 px-1">manager</code> te zetten.
      </div>
    );
  }

  if (loading) return <p className="text-slate-500">Teamcijfers laden…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Team &amp; coaching</h1>
      <p className="mb-4 text-sm text-slate-500">
        X/Y/Z-conversie per verkoper. Het <strong>focuspunt</strong> is de zwakste
        schakel in iemands funnel — daar valt de meeste winst te coachen.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen deals in het team.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Verkoper</th>
                <th className="px-4 py-2 text-right font-medium">Leads</th>
                <th className="px-4 py-2 text-right font-medium">Afspr.</th>
                <th className="px-4 py-2 text-right font-medium">Offertes</th>
                <th className="px-4 py-2 text-right font-medium">Orders</th>
                <th className="px-4 py-2 text-right font-medium">X</th>
                <th className="px-4 py-2 text-right font-medium">Y</th>
                <th className="px-4 py-2 text-right font-medium">Z</th>
                <th className="px-4 py-2 font-medium">Focuspunt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const focus = focusPoint(o);
                return (
                  <tr key={o.ownerId} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{o.name}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{o.stats.leads}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{o.stats.afspraken}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{o.stats.offertes}</td>
                    <td className="px-4 py-2 text-right font-semibold">{o.stats.orders}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{pct(o.stats.x)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{pct(o.stats.y)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{pct(o.stats.z)}</td>
                    <td className="px-4 py-2">
                      {focus ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {focus.label} · {pct(focus.ratio)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
