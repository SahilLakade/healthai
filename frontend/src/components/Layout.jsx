import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ClipboardList, Cpu, LayoutDashboard, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { getHealth } from "../api/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assess", label: "Risk Assessment", icon: ClipboardList },
  { to: "/model", label: "Model Information", icon: Cpu },
];

function NavItems({ onClick }) {
  return NAV.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  ));
}

function Status() {
  const [s, setS] = useState("checking");
  useEffect(() => {
    let on = true;
    getHealth().then(() => on && setS("online")).catch(() => on && setS("offline"));
    return () => { on = false; };
  }, []);
  const map = {
    checking: ["bg-slate-300", "Checking server..."],
    online: ["bg-emerald-500", "Backend connected"],
    offline: ["bg-red-500", "Backend offline"],
  };
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
      <span className={`h-2 w-2 rounded-full ${map[s][0]}`} />
      {map[s][1]}
    </span>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-5 lg:fixed lg:inset-y-0 lg:flex">
        <Link to="/"><Logo /></Link>
        <nav className="mt-8 space-y-1" aria-label="Main"><NavItems /></nav>
        <div className="mt-auto space-y-2">
          <Status />
          <p className="text-xs text-slate-500">Educational prototype. Not medical advice.</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/"><Logo /></Link>
            <button className="btn-secondary !px-3 !py-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          {open && (
            <div className="space-y-2 border-t border-slate-100 px-4 py-3">
              <NavItems onClick={() => setOpen(false)} />
              <Status />
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500 sm:px-6 lg:px-8">
          HealthAI is an educational project. Predictions are not medical advice.
        </footer>
      </div>
    </div>
  );
}