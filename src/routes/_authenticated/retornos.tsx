import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { ClientCard } from "@/components/ClientCard";
import { useClients } from "@/lib/clients";
import { cn } from "@/lib/utils";

const TABS = {
  hoje: "Hoje",
  atrasado: "Atrasados",
  proximo: "7 dias",
  todos: "Todos",
  sem_frequencia: "Sem frequência",
} as const;
type Tab = keyof typeof TABS;

export const Route = createFileRoute("/_authenticated/retornos")({
  head: () => ({ meta: [{ title: "Retornos — Carteira" }, { name: "description", content: "Quem precisa voltar." }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s["tab"];
    return typeof t === "string" && t in TABS ? { tab: t as Tab } : {};
  },
  component: Retornos,
});

function Retornos() {
  const tab = Route.useSearch().tab ?? "hoje";
  const navigate = useNavigate({ from: "/retornos" });
  const { data: clients = [] } = useClients();
  const withDate = clients.filter((c) => c.next_return).sort((a, b) => a.next_return!.localeCompare(b.next_return!));
  const lists: Record<Tab, typeof clients> = {
    hoje: clients.filter((c) => c.status === "hoje"),
    atrasado: withDate.filter((c) => c.status === "atrasado"),
    proximo: withDate.filter((c) => c.status === "proximo"),
    todos: withDate,
    sem_frequencia: clients.filter((c) => c.status === "sem_frequencia"),
  };

  return (
    <div>
      <PageHeader title="Retornos" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => navigate({ search: { tab: t }, replace: true })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm",
              tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            {TABS[t]} <span className="opacity-70">{lists[t].length}</span>
          </button>
        ))}
      </div>
      {tab === "sem_frequencia" && lists[tab].length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Abra a ficha e defina a frequência de retorno para calcular a data prevista.</p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {lists[tab].map((c) => <ClientCard key={c.id} client={c} />)}
      </div>
      {lists[tab].length === 0 && <p className="mt-10 text-center text-sm text-muted-foreground">Nenhum cliente nesta lista.</p>}
    </div>
  );
}
