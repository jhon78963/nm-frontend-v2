import {
  KardexMeta,
  KardexMovement,
  KardexReference,
  KardexReport,
} from '../models/kardex.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function adaptKardexReference(raw: unknown): KardexReference | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const r = raw as Record<string, unknown>;

  return {
    morphShort:
      r['morph_short'] != null ? readString(r['morph_short']) : null,
    code: r['code'] != null ? readString(r['code']) : null,
  };
}

function adaptKardexMovement(raw: unknown): KardexMovement {
  const r = raw as Record<string, unknown>;

  return {
    id: readNumber(r['id']),
    occurredAt: readString(r['occurred_at']),
    direction: r['direction'] === 'OUT' ? 'OUT' : 'IN',
    movementTypeLabel: readString(r['movement_type_label']),
    quantity: readNumber(r['quantity']),
    balanceAfterMovement: readNumber(r['balance_after_movement']),
    reference: adaptKardexReference(r['reference']),
  };
}

function adaptKardexMeta(raw: unknown): KardexMeta {
  const r = (raw ?? {}) as Record<string, unknown>;

  return {
    openingBalanceQuantity: readNumber(r['opening_balance_quantity']),
    closingBalanceQuantity: readNumber(r['closing_balance_quantity']),
    movementsCount: readNumber(r['movements_count']),
    productName:
      r['product_name'] != null ? readString(r['product_name']) : undefined,
    warehouseName:
      r['warehouse_name'] != null ? readString(r['warehouse_name']) : undefined,
    startDate:
      r['fecha_inicio'] != null ? readString(r['fecha_inicio']) : undefined,
    endDate: r['fecha_fin'] != null ? readString(r['fecha_fin']) : undefined,
  };
}

function adaptKardexPayload(raw: Record<string, unknown>): KardexReport {
  const movementsRaw = raw['movements'];
  const movements = Array.isArray(movementsRaw)
    ? movementsRaw.map(adaptKardexMovement)
    : [];

  return {
    meta: adaptKardexMeta(raw['meta']),
    movements,
  };
}

export function adaptKardexReport(raw: unknown): KardexReport | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const envelope = raw as Record<string, unknown>;

  if (envelope['success'] === false) {
    return null;
  }

  const nestedData = envelope['data'];
  if (nestedData && typeof nestedData === 'object') {
    return adaptKardexPayload(nestedData as Record<string, unknown>);
  }

  if ('meta' in envelope || 'movements' in envelope) {
    return adaptKardexPayload(envelope);
  }

  return null;
}
