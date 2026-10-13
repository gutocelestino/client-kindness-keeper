import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { nextReturnDate, returnStatus, type ReturnStatus, todayISO } from "./recurrence";

export type Client = Tables<"clients">;
export type Visit = Tables<"visits">;
export type ClientRow = Client & { next_return: string | null; status: ReturnStatus };

export const QUALIFICATION = {
  qualificado: "Qualificado",
  nao_qualificado: "Não qualificado",
  nao_avaliado: "Não avaliado",
} as const;
export const CLIENT_TYPE = {
  ideal: "Cliente ideal",
  assinante: "Assinante",
  nao_qualificado: "Não qualificado",
  outros: "Outros",
} as const;
export const YES_NO = { sim: "Sim", nao: "Não", nao_informado: "Não informado" } as const;
export const STATUS_LABEL: Record<ReturnStatus, string> = {
  sem_frequencia: "Sem frequência",
  atrasado: "Atrasado",
  hoje: "Retorno hoje",
  proximo: "Próximos 7 dias",
  em_dia: "Em dia",
};

export function enrich(c: Client, today = todayISO()): ClientRow {
  return {
    ...c,
    next_return: nextReturnDate(c.last_visit_date, c.return_frequency_days),
    status: returnStatus(c.last_visit_date, c.return_frequency_days, today),
  };
}

export const clientsKey = ["clients"] as const;

export function useClients() {
  return useQuery({
    queryKey: clientsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("full_name");
      if (error) throw error;
      const today = todayISO();
      return (data ?? []).map((c) => enrich(c, today));
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? enrich(data) : null;
    },
  });
}

export function useVisits(clientId: string) {
  return useQuery({
    queryKey: ["visits", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("client_id", clientId)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function phoneDigits(p: string | null | undefined): string {
  return (p ?? "").replace(/\D/g, "");
}

/** Brazilian numbers without country code get 55 prepended. */
export function whatsappUrl(c: Pick<Client, "phone" | "full_name">): string | null {
  let d = phoneDigits(c.phone);
  if (d.length < 10) return null;
  if (d.length <= 11) d = "55" + d;
  const first = c.full_name.trim().split(/\s+/)[0];
  const msg = `Fala, ${first}! Tudo certo? Já está chegando a hora de dar aquela ajustada no corte. Quer que eu veja um horário pra você?`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

export async function findByPhone(phone: string, excludeId?: string) {
  const d = phoneDigits(phone);
  if (d.length < 8) return [];
  const { data } = await supabase.from("clients").select("id, full_name, phone");
  return (data ?? []).filter(
    (c) => c.id !== excludeId && phoneDigits(c.phone).slice(-9) === d.slice(-9),
  );
}

export function instagramUrl(handle: string | null | undefined) {
  if (!handle) return null;
  const h = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/@]/g, "");
  return h ? `https://instagram.com/${h}` : null;
}
