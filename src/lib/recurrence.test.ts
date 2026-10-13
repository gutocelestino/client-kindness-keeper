import { describe, it, expect } from "vitest";
import { nextReturnDate, returnStatus, parseDateFlexible, parseFrequency } from "./recurrence";

describe("recorrência", () => {
  it("13/10/2026 + 25 dias = 07/11/2026", () => {
    expect(nextReturnDate("2026-10-13", 25)).toBe("2026-11-07");
  });
  it("sem frequência não inventa data", () => {
    expect(nextReturnDate("2026-10-13", null)).toBeNull();
    expect(returnStatus("2026-10-13", null, "2026-10-13")).toBe("sem_frequencia");
  });
  it("aparece em retornos de hoje na data prevista", () => {
    expect(returnStatus("2026-10-13", 25, "2026-11-07")).toBe("hoje");
  });
  it("continua atrasado nos dias seguintes", () => {
    expect(returnStatus("2026-10-13", 25, "2026-11-10")).toBe("atrasado");
  });
  it("atendimento real em outra data recalcula a partir da data real", () => {
    // previsto 07/11, veio 10/11 -> próximo 05/12, fora dos vencidos
    expect(nextReturnDate("2026-11-10", 25)).toBe("2026-12-05");
    expect(returnStatus("2026-11-10", 25, "2026-11-10")).toBe("em_dia");
  });
  it("próximos 7 dias", () => {
    expect(returnStatus("2026-10-05", 15, "2026-10-13")).toBe("proximo");
  });
  it("alterar frequência muda a previsão", () => {
    expect(nextReturnDate("2026-10-05", 30)).toBe("2026-11-04");
  });
  it("lê datas e frequências da planilha", () => {
    expect(parseDateFlexible("26/09/2026")).toBe("2026-09-26");
    expect(parseFrequency("25 Dias")).toBe(25);
    expect(parseFrequency("")).toBeNull();
  });
});
