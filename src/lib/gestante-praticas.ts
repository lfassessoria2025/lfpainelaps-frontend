import type { GestanteAcompanhamentoOut } from "@/lib/api-types";

/**
 * Práticas do indicador C3 (Cuidado na Gestação e Puerpério, Previne Brasil).
 * Ordem alfabética A-K para leitura — não é a ordem dos campos no schema
 * (que segue a ordem de extração do backend).
 */
export type PraticaLetra = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K";

interface PraticaBoolDef {
  tipo: "bool";
  letra: PraticaLetra;
  /** Nome curto reconhecível — mesma nomenclatura da planilha que a cliente já usa. */
  rotulo: string;
  titulo: string;
  campo: keyof GestanteAcompanhamentoOut;
}

interface PraticaContagemDef {
  tipo: "contagem";
  letra: PraticaLetra;
  rotulo: string;
  titulo: string;
  campo: keyof GestanteAcompanhamentoOut;
  meta: number;
}

export type PraticaDef = PraticaBoolDef | PraticaContagemDef;

export const PRATICAS: PraticaDef[] = [
  {
    tipo: "bool",
    letra: "A",
    rotulo: "Pré-Natal <12 sem.",
    titulo: "Captação precoce (até a 12ª semana de gestação)",
    campo: "pratica_a_captacao_precoce",
  },
  {
    tipo: "contagem",
    letra: "B",
    rotulo: "Consultas (7)",
    titulo: "Consultas de pré-natal (meta: 7)",
    campo: "pratica_b_consultas",
    meta: 7,
  },
  {
    tipo: "contagem",
    letra: "C",
    rotulo: "P.A. (7)",
    titulo: "Verificação da pressão arterial (meta: 7)",
    campo: "pratica_c_pressao",
    meta: 7,
  },
  {
    tipo: "contagem",
    letra: "D",
    rotulo: "Peso/Altura (7)",
    titulo: "Verificação de peso e altura (meta: 7)",
    campo: "pratica_d_peso_altura",
    meta: 7,
  },
  {
    tipo: "contagem",
    letra: "E",
    rotulo: "VD Gestação (3)",
    titulo: "Visita domiciliar na gestação (meta: 3)",
    campo: "pratica_e_vd_gestacao",
    meta: 3,
  },
  {
    tipo: "bool",
    letra: "F",
    rotulo: "Vacina dTpa",
    titulo: "Vacina dTpa em dia",
    campo: "pratica_f_vacina_dtpa",
  },
  {
    tipo: "bool",
    letra: "G",
    rotulo: "Exames 1ºT",
    titulo: "Exames no 1º trimestre (Sífilis, HIV, Hepatites B e C)",
    campo: "pratica_g_exames_1t",
  },
  {
    tipo: "bool",
    letra: "H",
    rotulo: "Exames 3ºT",
    titulo: "Exames no 3º trimestre (Sífilis e HIV)",
    campo: "pratica_h_exames_3t",
  },
  {
    tipo: "bool",
    letra: "I",
    rotulo: "Consulta Puerpério",
    titulo: "Consulta de puerpério",
    campo: "pratica_i_consulta_puerperio",
  },
  {
    tipo: "bool",
    letra: "J",
    rotulo: "VD Puerpério",
    titulo: "Visita domiciliar no puerpério",
    campo: "pratica_j_vd_puerperio",
  },
  {
    tipo: "bool",
    letra: "K",
    rotulo: "Odonto",
    titulo: "Saúde bucal",
    campo: "pratica_k_saude_bucal",
  },
];

export type StatusPratica = "completa" | "parcial" | "pendente";

export function statusDaPratica(
  gestante: GestanteAcompanhamentoOut,
  def: PraticaDef,
): { status: StatusPratica; texto: string } {
  if (def.tipo === "bool") {
    const feito = Boolean(gestante[def.campo]);
    return feito ? { status: "completa", texto: "Feito" } : { status: "pendente", texto: "Pendente" };
  }
  const valor = Number(gestante[def.campo] ?? 0);
  if (valor >= def.meta) return { status: "completa", texto: `${valor}/${def.meta}` };
  if (valor > 0) return { status: "parcial", texto: `${valor}/${def.meta}` };
  return { status: "pendente", texto: `${valor}/${def.meta}` };
}
