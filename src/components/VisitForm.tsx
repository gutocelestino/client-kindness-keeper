import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ClientForm";
import { useInvalidateAll, type Visit } from "@/lib/clients";
import { formatBR, nextReturnDate, todayISO } from "@/lib/recurrence";

/** Creates or edits a visit. The database trigger recalculates the client's last visit. */
export function VisitForm({
  clientId,
  frequency,
  visit,
  defaultService,
  onDone,
}: {
  clientId: string;
  frequency: number | null;
  visit?: Visit | undefined;
  defaultService?: string | null;
  onDone?: () => void;
}) {
  const [date, setDate] = useState(visit?.visit_date ?? todayISO());
  const [service, setService] = useState(visit?.service ?? defaultService ?? "");
  const [note, setNote] = useState(visit?.note ?? "");
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateAll();
  const next = nextReturnDate(date, frequency);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error("Informe a data");
      return;
    }
    setBusy(true);
    const payload = { client_id: clientId, visit_date: date, service: service.trim() || null, note: note.trim() || null };
    const { error } = visit
      ? await supabase.from("visits").update(payload).eq("id", visit.id)
      : await supabase.from("visits").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(visit ? "Atendimento corrigido" : "Atendimento registrado");
    invalidate();
    onDone?.();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Data do atendimento">
        <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Serviço realizado">
        <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="ex: Corte + Barba" />
      </Field>
      <Field label="Observação (opcional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="rounded-xl bg-muted/60 p-3 text-sm">
        {next ? (
          <>Próximo retorno previsto: <b className="text-primary">{formatBR(next)}</b></>
        ) : (
          <span className="text-muted-foreground">Frequência não configurada — defina na ficha para calcular o retorno.</span>
        )}
      </div>
      <Button type="submit" className="h-12 w-full" disabled={busy}>
        {visit ? "Salvar correção" : "Registrar atendimento"}
      </Button>
    </form>
  );
}
