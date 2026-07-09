import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { session, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold">XYZ-CRM</span>
            <nav className="flex gap-4 text-sm">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? "font-semibold text-indigo-600" : "text-slate-600 hover:text-slate-900"
                }
              >
                Pipeline
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{session?.user.email}</span>
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
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
