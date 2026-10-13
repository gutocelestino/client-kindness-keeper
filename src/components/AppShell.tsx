import { Link, Outlet } from "@tanstack/react-router";
import { CalendarClock, LayoutGrid, Plus, Settings, Users, ArrowDownUp, Scissors } from "lucide-react";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutGrid },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/registrar", label: "Registrar", icon: Plus, primary: true },
  { to: "/retornos", label: "Retornos", icon: CalendarClock },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

const DESKTOP = [
  { to: "/painel", label: "Dashboard", icon: LayoutGrid },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/retornos", label: "Retornos", icon: CalendarClock },
  { to: "/registrar", label: "Registrar atendimento", icon: Plus },
  { to: "/dados", label: "Importar e exportar", icon: ArrowDownUp },
  { to: "/ajustes", label: "Configurações", icon: Settings },
] as const;

export function AppShell() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <span className="font-display text-2xl">Carteira</span>
        </div>
        <nav className="space-y-1">
          {DESKTOP.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-safe md:px-8 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-sidebar/90 pb-safe backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-2">
          {NAV.map((n) =>
            "primary" in n ? (
              <Link key={n.to} to={n.to} className="-mt-5 flex flex-col items-center gap-1" aria-label={n.label}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brass text-primary-foreground shadow-card">
                  <n.icon className="h-6 w-6" />
                </span>
              </Link>
            ) : (
              <Link
                key={n.to}
                to={n.to}
                className="flex w-16 flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
                activeProps={{ className: "text-primary" }}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pb-5 pt-6 md:pt-10">
      <div>
        <h1 className="font-display text-4xl leading-none md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
