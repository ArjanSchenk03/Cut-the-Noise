import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", end: false },
  { to: "/acties", label: "Acties", end: false },
  { to: "/", label: "Pipeline", end: true },
  { to: "/deals", label: "Deals", end: false },
  { to: "/accounts", label: "Accounts", end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-xs font-semibold uppercase tracking-wider transition-colors ${
    isActive ? "text-ctn-gold" : "text-ctn-offwhite/70 hover:text-ctn-offwhite"
  }`;

export default function Layout() {
  const { session, isManager, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="bg-ctn-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <span className="text-base font-extrabold tracking-tight text-ctn-offwhite">
              CTN<span className="text-ctn-gold">.</span>CRM
            </span>
            <nav className="flex gap-5">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
              {isManager && (
                <NavLink to="/team" className={linkClass}>
                  Team
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ctn-offwhite/60 sm:inline">{session?.user.email}</span>
            <button
              onClick={signOut}
              className="rounded-lg border border-ctn-offwhite/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ctn-offwhite hover:bg-ctn-offwhite/10"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
