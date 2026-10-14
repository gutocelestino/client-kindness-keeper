import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Instagram, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "@/components/ClientForm";
import { VisitForm } from "@/components/VisitForm";
import { ContactButton, StatusBadge, WhatsAppButton } from "@/components/ClientCard";
import { CLIENT_TYPE, QUALIFICATION, YES_NO, instagramUrl, useClient, useInvalidateAll, useVisits, type Visit } from "@/lib/clients";
import { formatBR } from "@/lib/recurrence";

export const Route = createFileRoute("/_authenticated/cliente/$id")({
  head: () => ({ meta: [{ title: "Ficha do cliente — Carteira" }, { name: "description", content: "Ficha e histórico do cliente." }] }),
  component: Ficha,
});

function Ficha() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: c, isLoading } = useClient(id);
  const { data: visits = [] } = useVisits(id);
  const [editing, setEditing] = useState(false);
  const [visitOpen, setVisitOpen] = useState<Visit | "new" | null>(null);
  const invalidate = useInvalidateAll();

  if (isLoading) return <p className="pt-10 text-muted-foreground">Carregando…</p>;
  if (!c) return <p className="pt-10">Cliente não encontrado.</p>;

  async function removeVisit(v: Visit) {
    if (!confirm(`Excluir o atendimento de ${formatBR(v.visit_date)}?`)) return;
    const { error } = await supabase.from("visits").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Atendimento excluído");
    invalidate();
  }
  async function removeClient() {
    if (!confirm(`Excluir ${c!.full_name} e todo o histórico?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
    navigate({ to: "/clientes" });
  }

  const extras = Object.entries((c.extra_fields ?? {}) as Record<string, unknown>).filter(([, v]) => v !== "" && v != null);
  const ig = instagramUrl(c.instagram);

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between pt-5">
        <Link to="/clientes" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar</Button>
      </div>
      <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{c.full_name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} />
        {c.is_example && <span className="rounded bg-muted px-2 text-[11px] uppercase text-muted-foreground">exemplo</span>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Big label="Última visita" value={formatBR(c.last_visit_date)} />
        <Big label="Próximo retorno" value={c.next_return ? formatBR(c.next_return) : "Definir frequência"} accent={!!c.next_return} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => setVisitOpen("new")}><Plus className="h-4 w-4" /> Registrar atendimento</Button>
        <WhatsAppButton client={c} />
        <ContactButton client={c} />
      </div>
      {c.last_contact_at && <p className="mt-2 text-xs text-muted-foreground">Último contato registrado: {formatBR(c.last_contact_at)}</p>}

      <div className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 text-sm md:grid-cols-2">
        {c.phone && <Row icon={<Phone className="h-4 w-4" />} v={<a href={`tel:${c.phone}`}>{c.phone}</a>} />}
        {c.instagram && <Row icon={<Instagram className="h-4 w-4" />} v={ig ? <a href={ig} target="_blank" rel="noreferrer">{c.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}</a> : c.instagram} />}
        {c.email && <Row icon={<Mail className="h-4 w-4" />} v={<a href={`mailto:${c.email}`}>{c.email}</a>} />}
        <KV k="Frequência de retorno" v={c.return_frequency_days ? `${c.return_frequency_days} dias` : "Não definida"} />
        <KV k="Qualificação" v={QUALIFICATION[c.qualification as keyof typeof QUALIFICATION]} />
        <KV k="Corta na tesoura?" v={YES_NO[c.scissor_cut as keyof typeof YES_NO]} />
        <KV k="Tipo de cliente" v={c.client_type ? CLIENT_TYPE[c.client_type as keyof typeof CLIENT_TYPE] : "Não definido"} />
        <KV k="Já fez brigadeiro?" v={YES_NO[c.brigadeiro as keyof typeof YES_NO]} />
        <KV k="Serviços contratados" v={c.services ?? "—"} />
        <KV k="Cadastrado em" v={formatBR(c.first_registered_at)} />
        {c.notes && <div className="md:col-span-2"><KV k="Observações" v={c.notes} /></div>}
        {extras.length > 0 && (
          <div className="border-t pt-3 md:col-span-2">
            <div className="mb-2 text-xs uppercase text-muted-foreground">Outros dados da planilha</div>
            {extras.map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}
          </div>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico ({visits.length})</h2>
      <ol className="relative space-y-3 border-l pl-5">
        {visits.map((v) => (
          <li key={v.id} className="relative rounded-xl border bg-card p-3">
            <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-primary" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{formatBR(v.visit_date)}</div>
                <div className="text-sm text-muted-foreground">{v.service ?? "Serviço não informado"}</div>
                {v.note && <div className="mt-1 text-sm">{v.note}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">Registrado em {formatBR(v.created_at)}</div>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Corrigir" onClick={() => setVisitOpen(v)}><Pencil className="h-4 w-4" /></button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Excluir" onClick={() => removeVisit(v)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </li>
        ))}
        {visits.length === 0 && <li className="text-sm text-muted-foreground">Nenhum atendimento registrado.</li>}
      </ol>

      <button onClick={removeClient} className="mt-10 text-sm text-destructive">Excluir cliente</button>

      {editing && <ClientForm open={editing} onOpenChange={setEditing} client={c} />}
      <Dialog open={!!visitOpen} onOpenChange={(o) => !o && setVisitOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-3xl font-normal">{visitOpen === "new" ? "Novo atendimento" : "Corrigir atendimento"}</DialogTitle></DialogHeader>
          {visitOpen && (
            <VisitForm
              clientId={c.id}
              frequency={c.return_frequency_days}
              visit={visitOpen === "new" ? undefined : visitOpen}
              defaultService={c.services}
              onDone={() => setVisitOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"mt-1 font-display text-3xl " + (accent ? "text-primary" : "")}>{value}</div>
    </div>
  );
}
function Row({ icon, v }: { icon: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center gap-2 break-all"><span className="text-muted-foreground">{icon}</span>{v}</div>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{k}</span><span className="text-right whitespace-pre-wrap">{v}</span></div>;
}
