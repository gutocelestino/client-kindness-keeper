import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { VisitForm } from "@/components/VisitForm";
import { StatusBadge } from "@/components/ClientCard";
import { Input } from "@/components/ui/input";
import { phoneDigits, useClients } from "@/lib/clients";

export const Route = createFileRoute("/_authenticated/registrar")({
  head: () => ({ meta: [{ title: "Registrar atendimento — Carteira" }, { name: "description", content: "Registro rápido de atendimento." }] }),
  component: Registrar,
});

function Registrar() {
  const { data: clients = [] } = useClients();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const client = clients.find((c) => c.id === selected);
  const ql = q.toLowerCase();
  const qd = phoneDigits(q);
  const matches = clients
    .filter((c) => !q || c.full_name.toLowerCase().includes(ql) || (qd.length >= 3 && phoneDigits(c.phone).includes(qd)))
    .sort((a, b) => ({ hoje: 0, atrasado: 1, proximo: 2, em_dia: 3, sem_frequencia: 4 })[a.status] - ({ hoje: 0, atrasado: 1, proximo: 2, em_dia: 3, sem_frequencia: 4 })[b.status])
    .slice(0, 30);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Registrar" subtitle="Atendimento de hoje ou retroativo" />
      {!client ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus className="h-12 pl-9" placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-3 divide-y overflow-hidden rounded-2xl border bg-card">
            {matches.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className="flex w-full items-center justify-between gap-2 p-4 text-left active:bg-muted">
                <div>
                  <div className="font-medium">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone ?? "Sem telefone"}</div>
                </div>
                <StatusBadge status={c.status} />
              </button>
            ))}
            {matches.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Cliente</div>
              <div className="text-lg font-semibold">{client.full_name}</div>
            </div>
            <button className="text-sm text-primary" onClick={() => setSelected(null)}>Trocar</button>
          </div>
          <VisitForm
            clientId={client.id}
            frequency={client.return_frequency_days}
            defaultService={client.services}
            onDone={() => navigate({ to: "/cliente/$id", params: { id: client.id } })}
          />
        </div>
      )}
    </div>
  );
}
