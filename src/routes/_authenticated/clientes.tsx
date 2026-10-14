import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ClientCard, StatusBadge } from "@/components/ClientCard";
import { ClientForm, Select } from "@/components/ClientForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLIENT_TYPE, QUALIFICATION, STATUS_LABEL, YES_NO, phoneDigits, useClients } from "@/lib/clients";
import { formatBR } from "@/lib/recurrence";

type S = { q?: string; qual?: string; tipo?: string; tesoura?: string; brig?: string; status?: string; freq?: string; sort?: string };
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Carteira" }, { name: "description", content: "Todos os clientes." }] }),
  validateSearch: (s: Record<string, unknown>): S => ({
    q: str(s.q), qual: str(s.qual), tipo: str(s.tipo), tesoura: str(s.tesoura), brig: str(s.brig),
    status: str(s.status), freq: str(s.freq), sort: str(s.sort),
  }),
  component: Clientes,
});

function Clientes() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/clientes" });
  const { data: clients = [], isLoading } = useClients();
  const [creating, setCreating] = useState(false);
  const set = (k: keyof S) => (v: string) => navigate({ search: (p: S) => ({ ...p, [k]: v || undefined }), replace: true });

  const list = useMemo(() => {
    const q = (s.q ?? "").toLowerCase().trim();
    const qd = phoneDigits(q);
    let r = clients.filter((c) => {
      if (q) {
        const hay = [c.full_name, c.instagram, c.email].join(" ").toLowerCase();
        if (!hay.includes(q) && !(qd.length >= 3 && phoneDigits(c.phone).includes(qd))) return false;
      }
      if (s.qual && c.qualification !== s.qual) return false;
      if (s.tipo && c.client_type !== s.tipo) return false;
      if (s.tesoura && c.scissor_cut !== s.tesoura) return false;
      if (s.brig && c.brigadeiro !== s.brig) return false;
      if (s.status && c.status !== s.status) return false;
      if (s.freq === "sem" && c.return_frequency_days) return false;
      if (s.freq && s.freq !== "sem" && c.return_frequency_days !== Number(s.freq)) return false;
      return true;
    });
    const sort = s.sort ?? "nome";
    r = [...r].sort((a, b) => {
      if (sort === "ultimo") return (b.last_visit_date ?? "").localeCompare(a.last_visit_date ?? "");
      if (sort === "proximo") return (a.next_return ?? "9999").localeCompare(b.next_return ?? "9999");
      return a.full_name.localeCompare(b.full_name);
    });
    return r;
  }, [clients, s]);

  const freqs = Array.from(new Set(clients.map((c) => c.return_frequency_days).filter(Boolean))).sort((a, b) => a! - b!);
  const active = Object.entries(s).filter(([k, v]) => v && k !== "sort" && k !== "q").length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={isLoading ? "Carregando…" : `${list.length} de ${clients.length}`}
        action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Novo</Button>}
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 pl-9" placeholder="Nome, telefone, Instagram ou e-mail" value={s.q ?? ""} onChange={(e) => set("q")(e.target.value)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Select value={s.status ?? ""} onChange={set("status")} options={STATUS_LABEL} empty="Situação: todas" />
        <Select value={s.qual ?? ""} onChange={set("qual")} options={QUALIFICATION} empty="Qualificação" />
        <Select value={s.tipo ?? ""} onChange={set("tipo")} options={CLIENT_TYPE} empty="Tipo de cliente" />
        <Select value={s.tesoura ?? ""} onChange={set("tesoura")} options={YES_NO} empty="Corta na tesoura" />
        <Select value={s.brig ?? ""} onChange={set("brig")} options={YES_NO} empty="Já fez brigadeiro" />
        <Select
          value={s.freq ?? ""}
          onChange={set("freq")}
          options={{ sem: "Sem frequência", ...Object.fromEntries(freqs.map((f) => [String(f), `${f} dias`])) }}
          empty="Frequência"
        />
        <Select value={s.sort ?? "nome"} onChange={set("sort")} options={{ nome: "Ordenar: nome", ultimo: "Último atendimento", proximo: "Próxima data" }} />
        {active > 0 && (
          <button onClick={() => navigate({ search: { q: s.q, sort: s.sort } })} className="flex h-10 items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
            <X className="h-4 w-4" /> Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {list.map((c) => <ClientCard key={c.id} client={c} />)}
      </div>
      <div className="mt-5 hidden overflow-hidden rounded-2xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nome</th><th>Telefone</th><th>Último</th><th>Freq.</th><th>Previsto</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/40">
                <td className="p-3 font-medium"><Link to="/cliente/$id" params={{ id: c.id }} className="hover:text-primary">{c.full_name}</Link></td>
                <td className="text-muted-foreground">{c.phone ?? "—"}</td>
                <td>{formatBR(c.last_visit_date)}</td>
                <td>{c.return_frequency_days ? `${c.return_frequency_days}d` : "—"}</td>
                <td>{formatBR(c.next_return)}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && list.length === 0 && <p className="mt-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
      {creating && <ClientForm open={creating} onOpenChange={setCreating} onSaved={(id) => navigate({ to: "/cliente/$id", params: { id } })} />}
    </div>
  );
}
