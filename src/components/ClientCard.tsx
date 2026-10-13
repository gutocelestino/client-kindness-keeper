import { Link } from "@tanstack/react-router";
import { ChevronRight, MessageCircle, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, whatsappUrl, useInvalidateAll, type ClientRow } from "@/lib/clients";
import { formatBR, type ReturnStatus } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ReturnStatus, string> = {
  atrasado: "bg-destructive/15 text-destructive",
  hoje: "bg-primary/15 text-primary",
  proximo: "bg-warning/15 text-warning",
  em_dia: "bg-success/15 text-success",
  sem_frequencia: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function WhatsAppButton({ client, compact }: { client: ClientRow; compact?: boolean }) {
  const url = whatsappUrl(client);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground",
        compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
      )}
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </a>
  );
}

export function ContactButton({ client, compact }: { client: ClientRow; compact?: boolean }) {
  const invalidate = useInvalidateAll();
  async function mark() {
    const { error } = await supabase.from("clients").update({ last_contact_at: new Date().toISOString() }).eq("id", client.id);
    if (error) return toast.error("Não foi possível registrar o contato");
    toast.success("Contato registrado");
    invalidate();
  }
  return (
    <button
      onClick={mark}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border bg-secondary font-medium text-secondary-foreground",
        compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
      )}
    >
      <PhoneCall className="h-4 w-4" /> Fiz contato
    </button>
  );
}

export function ClientCard({ client, showActions = true }: { client: ClientRow; showActions?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <Link to="/cliente/$id" params={{ id: client.id }} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{client.full_name}</h3>
            {client.is_example && <span className="rounded bg-muted px-1.5 text-[10px] uppercase text-muted-foreground">exemplo</span>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{client.phone || "Sem telefone"}</p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Info label="Último" value={formatBR(client.last_visit_date)} />
        <Info label="Frequência" value={client.return_frequency_days ? `${client.return_frequency_days} dias` : "Definir"} />
        <Info label="Previsto" value={formatBR(client.next_return)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={client.status} />
          {client.last_contact_at && (
            <span className="text-[11px] text-muted-foreground">contato {formatBR(client.last_contact_at)}</span>
          )}
        </div>
        {showActions && (
          <div className="flex gap-2">
            <ContactButton client={client} compact />
            <WhatsAppButton client={client} compact />
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
