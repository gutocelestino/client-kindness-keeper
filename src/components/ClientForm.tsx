import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CLIENT_TYPE, QUALIFICATION, YES_NO, findByPhone, useInvalidateAll, type Client } from "@/lib/clients";
import { todayISO } from "@/lib/recurrence";

type Form = {
  full_name: string;
  phone: string;
  instagram: string;
  email: string;
  first_registered_at: string;
  last_visit_date: string;
  return_frequency_days: string;
  qualification: string;
  scissor_cut: string;
  client_type: string;
  brigadeiro: string;
  services: string;
  notes: string;
};

function toForm(c?: Client | null): Form {
  return {
    full_name: c?.full_name ?? "",
    phone: c?.phone ?? "",
    instagram: c?.instagram ?? "",
    email: c?.email ?? "",
    first_registered_at: c ? (c.first_registered_at ?? "") : todayISO(),
    last_visit_date: c?.last_visit_date ?? "",
    return_frequency_days: c?.return_frequency_days?.toString() ?? "",
    qualification: c?.qualification ?? "nao_avaliado",
    scissor_cut: c?.scissor_cut ?? "nao_informado",
    client_type: c?.client_type ?? "",
    brigadeiro: c?.brigadeiro ?? "nao_informado",
    services: c?.services ?? "",
    notes: c?.notes ?? "",
  };
}

const nul = (s: string) => (s.trim() === "" ? null : s.trim());

export function ClientForm({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client?: Client | null;
  onSaved?: (id: string) => void;
}) {
  const [f, setF] = useState<Form>(() => toForm(client));
  const [dups, setDups] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [confirmedDup, setConfirmedDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateAll();
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function checkPhone() {
    if (!f.phone) return setDups([]);
    setDups(await findByPhone(f.phone, client?.id));
    setConfirmedDup(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.full_name.trim()) return toast.error("Informe o nome");
    if (f.phone) {
      const found = await findByPhone(f.phone, client?.id);
      setDups(found);
      if (found.length && !confirmedDup) {
        toast.warning("Já existe cliente com esse telefone. Revise ou confirme.");
        return;
      }
    }
    const freq = f.return_frequency_days ? parseInt(f.return_frequency_days, 10) : null;
    const payload = {
      full_name: f.full_name.trim(),
      phone: nul(f.phone),
      instagram: nul(f.instagram),
      email: nul(f.email),
      first_registered_at: nul(f.first_registered_at),
      last_visit_date: nul(f.last_visit_date),
      return_frequency_days: freq && freq > 0 ? freq : null,
      qualification: f.qualification,
      scissor_cut: f.scissor_cut,
      client_type: nul(f.client_type),
      brigadeiro: f.brigadeiro,
      services: nul(f.services),
      notes: nul(f.notes),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const res = client
      ? await supabase.from("clients").update(payload).eq("id", client.id).select("id").single()
      : await supabase.from("clients").insert(payload).select("id").single();
    setBusy(false);
    if (res.error) return toast.error("Erro ao salvar: " + res.error.message);
    toast.success(client ? "Cliente atualizado" : "Cliente cadastrado");
    invalidate();
    onOpenChange(false);
    onSaved?.(res.data.id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl md:mx-auto md:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-3xl font-normal">{client ? "Editar cliente" : "Novo cliente"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={save} className="grid gap-4 px-4 pb-8 md:grid-cols-2">
          <Field label="Nome completo *" className="md:col-span-2">
            <Input value={f.full_name} onChange={(e) => set("full_name")(e.target.value)} autoFocus={!client} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input inputMode="tel" value={f.phone} onChange={(e) => set("phone")(e.target.value)} onBlur={checkPhone} />
          </Field>
          <Field label="Instagram">
            <Input value={f.instagram} onChange={(e) => set("instagram")(e.target.value)} placeholder="@usuario" />
          </Field>
          {dups.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm md:col-span-2">
              <div className="flex items-center gap-2 font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> Possível cliente duplicado
              </div>
              <ul className="mt-1">
                {dups.map((d) => (
                  <li key={d.id}>
                    <Link to="/cliente/$id" params={{ id: d.id }} className="underline" onClick={() => onOpenChange(false)}>
                      {d.full_name}
                    </Link>{" "}
                    — {d.phone}
                  </li>
                ))}
              </ul>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={confirmedDup} onChange={(e) => setConfirmedDup(e.target.checked)} />
                Salvar mesmo assim
              </label>
            </div>
          )}
          <Field label="E-mail" className="md:col-span-2">
            <Input type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} />
          </Field>
          <Field label="Data do cadastro">
            <Input type="date" value={f.first_registered_at} onChange={(e) => set("first_registered_at")(e.target.value)} />
          </Field>
          <Field label="Último atendimento">
            <Input type="date" value={f.last_visit_date} onChange={(e) => set("last_visit_date")(e.target.value)} />
          </Field>
          <Field label="Frequência de retorno (dias)">
            <Input type="number" inputMode="numeric" min={1} value={f.return_frequency_days} onChange={(e) => set("return_frequency_days")(e.target.value)} placeholder="ex: 25" />
          </Field>
          <Field label="Qualificação">
            <Select value={f.qualification} onChange={set("qualification")} options={QUALIFICATION} />
          </Field>
          <Field label="Corta na tesoura?">
            <Select value={f.scissor_cut} onChange={set("scissor_cut")} options={YES_NO} />
          </Field>
          <Field label="Tipo de cliente">
            <Select value={f.client_type} onChange={set("client_type")} options={CLIENT_TYPE} empty="Não definido" />
          </Field>
          <Field label="Já fez brigadeiro?">
            <Select value={f.brigadeiro} onChange={set("brigadeiro")} options={YES_NO} />
          </Field>
          <Field label="Serviços contratados">
            <Input value={f.services} onChange={(e) => set("services")(e.target.value)} />
          </Field>
          <Field label="Observações" className="md:col-span-2">
            <Textarea rows={3} value={f.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
          <Button type="submit" className="h-12 md:col-span-2" disabled={busy}>
            Salvar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  empty,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
  empty?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-foreground"
    >
      {empty !== undefined && <option value="">{empty}</option>}
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k} className="bg-popover">
          {v}
        </option>
      ))}
    </select>
  );
}
