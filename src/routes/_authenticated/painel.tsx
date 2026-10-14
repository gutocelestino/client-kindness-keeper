import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { ClientCard } from "@/components/ClientCard";
import { useClients, type ClientRow } from "@/lib/clients";
import { formatBR, todayISO } from "@/lib/recurrence";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — Carteira" }, { name: "description", content: "Resumo da carteira de clientes." }] }),
  component: Painel,
});

function Painel() {
  const { data: clients = [], isLoading } = useClients();
  const count = (f: (c: ClientRow) => boolean) => clients.filter(f).length;
  const byNext = (a: ClientRow, b: ClientRow) => (a.next_return ?? "").localeCompare(b.next_return ?? "");
  const hoje = clients.filter((c) => c.status === "hoje");
  const atrasados = clients.filter((c) => c.status === "atrasado").sort(byNext);
  const proximos = clients.filter((c) => c.status === "proximo").sort(byNext);

  const cards: { label: string; value: number; search: Record<string, string>; accent?: boolean }[] = [
    { label: "Total de clientes", value: clients.length, search: {} },
    { label: "Retorno hoje", value: hoje.length, search: { status: "hoje" }, accent: true },
    { label: "Atrasados", value: atrasados.length, search: { status: "atrasado" } },
    { label: "Próximos 7 dias", value: proximos.length, search: { status: "proximo" } },
    { label: "Qualificados", value: count((c) => c.qualification === "qualificado"), search: { qual: "qualificado" } },
    { label: "Não qualificados", value: count((c) => c.qualification === "nao_qualificado"), search: { qual: "nao_qualificado" } },
    { label: "Clientes ideais", value: count((c) => c.client_type === "ideal"), search: { tipo: "ideal" } },
    { label: "Assinantes", value: count((c) => c.client_type === "assinante"), search: { tipo: "assinante" } },
  ];

  return (
    <div>
      <PageHeader title="Painel" subtitle={`Hoje, ${formatBR(todayISO())}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to="/clientes"
            search={c.search}
            className={
              "rounded-2xl border p-4 shadow-card transition-transform active:scale-[0.98] " +
              (c.accent ? "bg-brass text-primary-foreground" : "bg-card")
            }
          >
            <div className={"text-xs " + (c.accent ? "opacity-80" : "text-muted-foreground")}>{c.label}</div>
            <div className="mt-1 font-display text-5xl leading-none">{isLoading ? "–" : c.value}</div>
          </Link>
        ))}
      </div>
      <Section title="Retornos de hoje" items={hoje} empty="Ninguém previsto para hoje." />
      <Section title="Atrasados" items={atrasados} empty="Nenhum cliente atrasado." />
      <Section title="Próximos retornos" items={proximos} empty="Nada nos próximos 7 dias." />
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: ClientRow[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} <span className="text-primary">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => <ClientCard key={c.id} client={c} />)}
        </div>
      )}
    </section>
  );
}
