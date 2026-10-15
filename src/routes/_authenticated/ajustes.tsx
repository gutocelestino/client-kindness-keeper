import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownUp, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useClients, useInvalidateAll } from "@/lib/clients";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Configurações — Carteira" }, { name: "description", content: "Conta e dados." }] }),
  component: Ajustes,
});

function Ajustes() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const { data: clients = [] } = useClients();
  const invalidate = useInvalidateAll();
  const examples = clients.filter((c) => c.is_example).length;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function removeExamples() {
    if (!confirm(`Remover ${examples} clientes marcados como exemplo?`)) return;
    const { error } = await supabase.from("clients").delete().eq("is_example", true);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Exemplos removidos");
    invalidate();
  }
  async function keepExamples() {
    const { error } = await supabase.from("clients").update({ is_example: false }).eq("is_example", true);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Clientes mantidos como reais");
    invalidate();
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Ajustes" />
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        <div className="p-4">
          <div className="text-xs text-muted-foreground">Conta</div>
          <div className="font-medium">{email}</div>
        </div>
        <Link to="/dados" className="flex items-center justify-between p-4">
          <span className="flex items-center gap-3"><ArrowDownUp className="h-4 w-4" /> Importar e exportar dados</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        {examples > 0 && (
          <div className="space-y-3 p-4">
            <div className="text-sm">
              <b>{examples}</b> clientes foram cadastrados da sua planilha como teste (marcados "exemplo").
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={keepExamples} className="rounded-xl border px-3 py-2 text-sm">Manter como reais</button>
              <button onClick={removeExamples} className="flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-sm text-destructive">
                <Trash2 className="h-4 w-4" /> Remover exemplos
              </button>
            </div>
          </div>
        )}
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
          className="flex w-full items-center gap-3 p-4 text-left text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}
