import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Carteira" },
      { name: "description", content: "Acesse sua carteira de clientes." },
      { property: "og:title", content: "Entrar — Carteira" },
      { property: "og:description", content: "Acesse sua carteira de clientes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("E-mail ou senha incorretos");
      navigate({ to: "/painel" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 pt-safe">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brass text-primary-foreground">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="font-display text-5xl">Carteira</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua gestão de clientes, sempre à mão.</p>
        </div>
        {sent ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm">
            Enviamos um link de confirmação para <b>{email}</b>. Confirme e depois entre aqui.
            <Button variant="ghost" className="mt-4 w-full" onClick={() => { setSent(false); setMode("in"); }}>
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Senha</Label>
              <Input id="pw" type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {mode === "in" ? "Entrar" : "Criar minha conta"}
            </Button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
