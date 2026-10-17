// Rótulo público do lote: o número vem sempre do sort_order (2 → "2º LOTE" / "LOTE 02").
// O campo `name` do lote fica só para uso interno no admin.
export interface LotLabels {
  /** Ex.: "2º LOTE" */
  name: string;
  /** Código curto para badges, ex.: "LOTE 02" */
  code: string;
}

export function lotLabels(sortOrder: number): LotLabels {
  return {
    name: `${sortOrder}º LOTE`,
    code: `LOTE ${String(sortOrder).padStart(2, '0')}`,
  };
}

// Usado enquanto carrega ou quando não há lote vigente
export const DEFAULT_LOT = lotLabels(1);
