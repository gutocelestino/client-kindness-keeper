import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carteira — Gestão de clientes do barbeiro visagista" },
      { name: "description", content: "Clientes, atendimentos e retornos em um só lugar." },
      { property: "og:title", content: "Carteira — Gestão de clientes" },
      { property: "og:description", content: "Clientes, atendimentos e retornos em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
