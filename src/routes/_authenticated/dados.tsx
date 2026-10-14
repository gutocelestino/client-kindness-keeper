import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CLIENT_TYPE, QUALIFICATION, YES_NO, phoneDigits, useClients, useInvalidateAll } from "@/lib/clients";
import { parseDateFlexible, parseFrequency } from "@/lib/recurrence";
import type { TablesInsert } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/dados")({
  head: () => ({ meta: [{ title: "Importar e exportar — Carteira" }, { name: "description", content: "Importe sua planilha e exporte backups." }] }),
  component: Dados,
});

const FIELDS = {
  ignore: "— Ignorar coluna",
  extra: "Guardar como dado extra",
  full_name: "Nome completo",
  phone: "Telefone / WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  first_registered_at: "Data do cadastro",
  last_visit_date: "Último atendimento",
  return_frequency_days: "Frequência (dias)",
  qualification: "Qualificação",
  scissor_cut: "Corta na tesoura?",
  client_type: "Tipo de cliente",
  brigadeiro: "Brigadeiro",
  services: "Serviços contratados",
  notes: "Observações",
} as const;
type FieldKey = keyof typeof FIELDS;

function guess(h: string): FieldKey {
  const s = h.toLowerCase();
  if (!s.trim() || /^colu(na|mn) ?\d+$/.test(s.trim())) return "ignore";
  if (s.includes("nome")) return "full_name";
  if (s.includes("whats") || s.includes("telefone") || s.includes("número")) return "phone";
  if (s.includes("insta")) return "instagram";
  if (s.includes("mail")) return "email";
  if (s.includes("último") || s.includes("ultimo")) return "last_visit_date";
  if (s.includes("frequ")) return "return_frequency_days";
  if (s.includes("qualific")) return "qualification";
  if (s.includes("tesoura")) return "scissor_cut";
  if (s.includes("brigadeiro")) return "brigadeiro";
  if (s.includes("tipo") || s.includes("público") || s.includes("publico")) return "client_type";
  if (s.includes("serviço") || s.includes("servico")) return "services";
  if (s.includes("observ")) return "notes";
  if (s.includes("cadastro")) return "first_registered_at";
  return "extra";
}

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function yesNo(v: string) {
  const n = norm(v);
  if (!n) return undefined;
  if (n === "sim" || n === "s" || n === "yes") return "sim";
  if (n === "nao" || n === "n" || n === "no") return "nao";
  return null; // unrecognized
}
function fromLabels(v: string, labels: Record<string, string>) {
  const n = norm(v);
  if (!n) return undefined;
  const hit = Object.entries(labels).find(([k, l]) => norm(l) === n || k === n);
  return hit ? hit[0] : null;
}

type Plan = { row: number; action: "create" | "update" | "skip"; reason?: string; name: string; payload: Partial<TablesInsert<"clients">>; existingId?: string; warnings: string[] };

function Dados() {
  const { data: clients = [] } = useClients();
  const invalidate = useInvalidateAll();
  const [rows, setRows] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState<FieldKey[]>([]);
  const [publicoSimIdeal, setPublicoSimIdeal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFile(file: File) {
    setSummary(null);
    let data: string[][] = [];
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
    } else {
      data = Papa.parse<string[]>(await file.text(), { skipEmptyLines: false }).data;
    }
    data = data.map((r) => r.map((c) => String(c ?? "")));
    // header = last row that looks like a header ("Nome ...") before data
    let h = data.findIndex((r, i) => i > 0 && norm(r[0] ?? "").startsWith("nome"));
    if (h < 0) h = 0;
    setRows(data);
    selectHeader(data, h);
  }
  function selectHeader(data: string[][], h: number) {
    setHeaderRow(h);
    setMap((data[h] ?? []).map(guess));
  }

  const headers = rows[headerRow] ?? [];
  const body = rows.slice(headerRow + 1).filter((r) => r.some((c) => c.trim()));

  const plans: Plan[] = useMemo(() => {
    const byPhone = new Map(clients.filter((c) => phoneDigits(c.phone).length >= 8).map((c) => [phoneDigits(c.phone).slice(-9), c.id]));
    const seen = new Set<string>();
    return body.map((r, i) => {
      const p: Partial<TablesInsert<"clients">> = {};
      const extra: Record<string, string> = {};
      const warnings: string[] = [];
      map.forEach((f, ci) => {
        const raw = (r[ci] ?? "").trim();
        const h = headers[ci] || `Coluna ${ci + 1}`;
        if (f === "ignore" || !raw) return;
        if (f === "extra") { extra[h] = raw; return; }
        const keepAsExtra = (msg: string) => { extra[h] = raw; warnings.push(msg); };
        switch (f) {
          case "last_visit_date": case "first_registered_at": {
            const d = parseDateFlexible(raw); d ? (p[f] = d) : keepAsExtra(`data inválida em "${h}"`); break;
          }
          case "return_frequency_days": {
            const n = parseFrequency(raw); n ? (p[f] = n) : keepAsExtra(`frequência inválida em "${h}"`); break;
          }
          case "scissor_cut": case "brigadeiro": {
            const v = yesNo(raw); v ? (p[f] = v) : keepAsExtra(`valor não reconhecido em "${h}"`); break;
          }
          case "qualification": {
            const v = fromLabels(raw, QUALIFICATION); v ? (p[f] = v) : keepAsExtra(`qualificação não reconhecida`); break;
          }
          case "client_type": {
            let v = fromLabels(raw, CLIENT_TYPE);
            if (!v && publicoSimIdeal && yesNo(raw) === "sim") v = "ideal";
            if (v) p[f] = v; else extra[h] = raw; break;
          }
          default: (p as Record<string, string>)[f] = raw;
        }
      });
      if (Object.keys(extra).length) p.extra_fields = extra;
      const name = (p.full_name as string) ?? "";
      if (!name) return { row: i + 1, action: "skip", reason: "sem nome", name: "(sem nome)", payload: p, warnings };
      const key = phoneDigits(p.phone as string).slice(-9);
      if (key.length >= 8 && seen.has(key)) return { row: i + 1, action: "skip", reason: "telefone repetido no arquivo", name, payload: p, warnings };
      if (key.length >= 8) seen.add(key);
      const existingId = key.length >= 8 ? byPhone.get(key) : undefined;
      return { row: i + 1, action: existingId ? "update" : "create", name, payload: p, existingId, warnings };
    });
  }, [body, map, headers, clients, publicoSimIdeal]);

  const counts = { create: plans.filter((p) => p.action === "create").length, update: plans.filter((p) => p.action === "update").length, skip: plans.filter((p) => p.action === "skip").length };

  async function runImport() {
    if (!confirm(`Criar ${counts.create} e atualizar ${counts.update} clientes?`)) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const p of plans) {
      if (p.action === "skip") continue;
      const lastVisit = p.payload.last_visit_date as string | undefined;
      if (p.action === "create") {
        const payload = { ...p.payload, full_name: p.name, first_registered_at: p.payload.first_registered_at ?? null };
        const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
        if (error) { fail++; continue; }
        if (lastVisit) await supabase.from("visits").insert({ client_id: data.id, visit_date: lastVisit, service: (p.payload.services as string) ?? null, note: "Importado da planilha" });
        ok++;
      } else {
        const existing = clients.find((c) => c.id === p.existingId);
        const { last_visit_date: _lv, ...rest } = p.payload;
        const payload = { ...rest, extra_fields: { ...((existing?.extra_fields as object) ?? {}), ...((p.payload.extra_fields as object) ?? {}) }, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("clients").update(payload).eq("id", p.existingId!);
        if (error) { fail++; continue; }
        if (lastVisit && (!existing?.last_visit_date || lastVisit > existing.last_visit_date)) {
          await supabase.from("visits").insert({ client_id: p.existingId!, visit_date: lastVisit, service: (p.payload.services as string) ?? null, note: "Importado da planilha" });
        }
        ok++;
      }
    }
    setBusy(false);
    invalidate();
    setSummary(`${ok} importados/atualizados · ${counts.skip} ignorados · ${fail} com erro`);
    setRows([]);
    toast.success("Importação concluída");
  }

  function exportCsv() {
    const data = clients.map((c) => ({
      Nome: c.full_name, Telefone: c.phone ?? "", Instagram: c.instagram ?? "", Email: c.email ?? "",
      "Data do cadastro": c.first_registered_at ?? "", "Último atendimento": c.last_visit_date ?? "",
      "Frequência (dias)": c.return_frequency_days ?? "", "Próximo retorno": c.next_return ?? "",
      Qualificação: QUALIFICATION[c.qualification as keyof typeof QUALIFICATION],
      "Corta na tesoura": YES_NO[c.scissor_cut as keyof typeof YES_NO],
      "Tipo de cliente": c.client_type ? CLIENT_TYPE[c.client_type as keyof typeof CLIENT_TYPE] : "",
      Brigadeiro: YES_NO[c.brigadeiro as keyof typeof YES_NO],
      Serviços: c.services ?? "", Observações: c.notes ?? "",
      "Dados extras": Object.keys((c.extra_fields as object) ?? {}).length ? JSON.stringify(c.extra_fields) : "",
    }));
    const blob = new Blob(["\ufeff" + Papa.unparse(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div>
      <PageHeader title="Dados" subtitle="Importar planilha e exportar backup" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-5 shadow-card">
          <Upload className="h-5 w-5 text-primary" />
          <div><div className="font-semibold">Importar CSV ou Excel</div><div className="text-xs text-muted-foreground">No Google Sheets: Arquivo → Fazer download → CSV</div></div>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <button onClick={exportCsv} className="flex items-center gap-3 rounded-2xl border bg-card p-5 text-left shadow-card">
          <Download className="h-5 w-5 text-primary" />
          <div><div className="font-semibold">Exportar clientes (CSV)</div><div className="text-xs text-muted-foreground">{clients.length} clientes</div></div>
        </button>
      </div>
      {summary && <p className="mt-4 rounded-xl bg-success/15 p-3 text-sm text-success">{summary}</p>}

      {rows.length > 0 && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Linha de cabeçalho:
            <select value={headerRow} onChange={(e) => selectHeader(rows, Number(e.target.value))} className="h-9 rounded-md border bg-transparent px-2">
              {rows.slice(0, 20).map((r, i) => <option key={i} value={i} className="bg-popover">{i + 1}: {r.filter(Boolean).slice(0, 3).join(", ").slice(0, 40)}</option>)}
            </select>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Mapear colunas</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border bg-card p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{h || `Coluna ${i + 1}`}</div>
                    <div className="truncate text-xs text-muted-foreground">{body.slice(0, 3).map((r) => r[i]).filter(Boolean).join(" · ") || "vazia"}</div>
                  </div>
                  <select value={map[i]} onChange={(e) => setMap((m) => m.map((v, j) => (j === i ? (e.target.value as FieldKey) : v)))} className="h-9 max-w-[48%] rounded-md border bg-transparent px-2 text-sm">
                    {Object.entries(FIELDS).map(([k, l]) => <option key={k} value={k} className="bg-popover">{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {map.includes("client_type") && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={publicoSimIdeal} onChange={(e) => setPublicoSimIdeal(e.target.checked)} />
                No campo Tipo de cliente, tratar "Sim" como "Cliente ideal"
              </label>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
              Prévia — {counts.create} novos · {counts.update} atualizações · {counts.skip} ignorados
            </h3>
            <div className="max-h-96 divide-y overflow-y-auto rounded-2xl border bg-card text-sm">
              {plans.map((p) => (
                <div key={p.row} className="flex items-start justify-between gap-2 p-3">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    {p.reason && <div className="text-xs text-muted-foreground">{p.reason}</div>}
                    {p.warnings.map((w) => <div key={w} className="text-xs text-warning">{w} — guardado como dado extra</div>)}
                  </div>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] " + (p.action === "create" ? "bg-success/15 text-success" : p.action === "update" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
                    {p.action === "create" ? "criar" : p.action === "update" ? "atualizar (mesmo telefone)" : "ignorar"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button className="h-12 w-full" disabled={busy || counts.create + counts.update === 0} onClick={runImport}>
            {busy ? "Importando…" : "Confirmar importação"}
          </Button>
        </div>
      )}
    </div>
  );
}
