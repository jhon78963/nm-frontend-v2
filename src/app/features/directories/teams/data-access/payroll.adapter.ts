import {
  PayrollApiResponse,
  PayrollAttendanceSlice,
  PayrollData,
  PayrollDeudaDia,
  PayrollPaymentItem,
  PayrollPeriod,
  PayrollTardanza,
} from '../models/payroll.model';

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function adaptTardanza(raw: unknown): PayrollTardanza {
  const r = raw as Record<string, unknown>;
  return {
    days: readNumber(r['days']),
    hours: readNumber(r['hours']),
    minutes: readNumber(r['minutes']),
  };
}

function adaptDeudaDia(raw: unknown): PayrollDeudaDia {
  const r = raw as Record<string, unknown>;
  return {
    date: readString(r['date']),
    status: readString(r['status']),
    checkIn: (r['checkIn'] ?? r['check_in']) as string | null,
    checkOut: (r['checkOut'] ?? r['check_out']) as string | null,
    deudaEntradaTardeMinutos: readNumber(
      r['deudaEntradaTardeMinutos'] ?? r['deuda_entrada_tarde_minutos'],
    ),
    deudaSalidaAnticipadaMinutos: readNumber(
      r['deudaSalidaAnticipadaMinutos'] ?? r['deuda_salida_anticipada_minutos'],
    ),
    favorLlegadaTempranaMinutos: readNumber(
      r['favorLlegadaTempranaMinutos'] ?? r['favor_llegada_temprana_minutos'],
    ),
    favorSalidaTardeMinutos: readNumber(
      r['favorSalidaTardeMinutos'] ?? r['favor_salida_tarde_minutos'],
    ),
    saldoNetoMinutos: readNumber(r['saldoNetoMinutos'] ?? r['saldo_neto_minutos']),
    saldoNetoSentido: (r['saldoNetoSentido'] ??
      r['saldo_neto_sentido'] ??
      'cero') as PayrollDeudaDia['saldoNetoSentido'],
  };
}

function adaptAttendanceSlice(raw: unknown): PayrollAttendanceSlice {
  const r = raw as Record<string, unknown>;
  return {
    falta: readNumber(r['falta']),
    faltaInjustificada: readNumber(r['faltaInjustificada'] ?? r['falta_injustificada']),
    valdeo: readNumber(r['valdeo']),
    recuperacion: readNumber(r['recuperacion']),
    faltasEquivalentes: readNumber(r['faltasEquivalentes'] ?? r['faltas_equivalentes']),
    faltasADescontar: readNumber(r['faltasADescontar'] ?? r['faltas_a_descontar']),
    descuentoPorAusencias: readNumber(
      r['descuentoPorAusencias'] ?? r['descuento_por_ausencias'],
    ),
    descuentoPorTiempoNoCumplido: readNumber(
      r['descuentoPorTiempoNoCumplido'] ?? r['descuento_por_tiempo_no_cumplido'],
    ),
    descuentoPorFaltas: readNumber(r['descuentoPorFaltas'] ?? r['descuento_por_faltas']),
    diasConRetraso: readNumber(r['diasConRetraso'] ?? r['dias_con_retraso']),
    deudaEntradaTardeMinutos: readNumber(
      r['deudaEntradaTardeMinutos'] ?? r['deuda_entrada_tarde_minutos'],
    ),
    deudaSalidaAnticipadaMinutos: readNumber(
      r['deudaSalidaAnticipadaMinutos'] ?? r['deuda_salida_anticipada_minutos'],
    ),
    deudaTiempoTotalMinutos: readNumber(
      r['deudaTiempoTotalMinutos'] ?? r['deuda_tiempo_total_minutos'],
    ),
    favorLlegadaTempranaTotalMinutos: readNumber(
      r['favorLlegadaTempranaTotalMinutos'] ?? r['favor_llegada_temprana_total_minutos'],
    ),
    favorSalidaTardeTotalMinutos: readNumber(
      r['favorSalidaTardeTotalMinutos'] ?? r['favor_salida_tarde_total_minutos'],
    ),
    favorTiempoTotalMinutos: readNumber(
      r['favorTiempoTotalMinutos'] ?? r['favor_tiempo_total_minutos'],
    ),
    saldoTiempoNetoMinutos: readNumber(
      r['saldoTiempoNetoMinutos'] ?? r['saldo_tiempo_neto_minutos'],
    ),
    saldoTiempoNetoSentido: (r['saldoTiempoNetoSentido'] ??
      r['saldo_tiempo_neto_sentido'] ??
      'cero') as PayrollAttendanceSlice['saldoTiempoNetoSentido'],
    saldoTiempoNetoMagnitud: adaptTardanza(
      r['saldoTiempoNetoMagnitud'] ?? r['saldo_tiempo_neto_magnitud'] ?? {},
    ),
    deudaEntradaTarde: adaptTardanza(r['deudaEntradaTarde'] ?? r['deuda_entrada_tarde'] ?? {}),
    deudaSalidaAnticipada: adaptTardanza(
      r['deudaSalidaAnticipada'] ?? r['deuda_salida_anticipada'] ?? {},
    ),
    deudaTiempo: adaptTardanza(r['deudaTiempo'] ?? r['deuda_tiempo'] ?? {}),
    favorLlegadaTemprana: adaptTardanza(
      r['favorLlegadaTemprana'] ?? r['favor_llegada_temprana'] ?? {},
    ),
    favorSalidaTarde: adaptTardanza(r['favorSalidaTarde'] ?? r['favor_salida_tarde'] ?? {}),
    deudaPorDia: ((r['deudaPorDia'] ?? r['deuda_por_dia'] ?? []) as unknown[]).map(
      adaptDeudaDia,
    ),
  };
}

function adaptMovements(raw: unknown): PayrollData['movementsMonth'] {
  const r = raw as Record<string, unknown>;
  return {
    advances: readNumber(r['advances']),
    payments: readNumber(r['payments']),
    deductions: readNumber(r['deductions']),
  };
}

function adaptPaymentItem(raw: unknown): PayrollPaymentItem {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r['id'] ?? ''),
    type: readString(r['type'], 'PAYMENT') as PayrollPaymentItem['type'],
    typeLabel: readString(r['typeLabel'] ?? r['type_label'], 'Movimiento'),
    amount: readNumber(r['amount']),
    date: readString(r['date']),
    payrollPeriod: (r['payrollPeriod'] ?? r['payroll_period'] ?? 'q1') as PayrollPaymentItem['payrollPeriod'],
    payrollPeriodLabel: readString(
      r['payrollPeriodLabel'] ?? r['payroll_period_label'],
      '',
    ),
    accountingMonth: (r['accountingMonth'] ?? r['accounting_month']) as string | null,
    accountingPeriodLabel: (r['accountingPeriodLabel'] ??
      r['accounting_period_label']) as string | null,
    description: (r['description']) as string | null,
    syncedToAdmin: Boolean(r['syncedToAdmin'] ?? r['synced_to_admin']),
    cashMovementId: (r['cashMovementId'] ?? r['cash_movement_id']) as string | null,
    paymentMethod: (r['paymentMethod'] ?? r['payment_method']) as string | null,
    voucherPath: (r['voucherPath'] ?? r['voucher_path']) as string | null,
    voucherPaths: (r['voucherPaths'] ?? r['voucher_paths'] ?? []) as string[],
    adminExpenseDescription: (r['adminExpenseDescription'] ??
      r['admin_expense_description']) as string | null,
  };
}

function adaptPayrollData(raw: unknown): PayrollData {
  const r = raw as Record<string, unknown>;
  const team = r['team'] as Record<string, unknown>;
  const calendar = r['calendar'] as Record<string, unknown>;
  const rates = r['rates'] as Record<string, unknown>;
  const estimates = r['estimates'] as Record<string, unknown>;
  const liq = r['liquidacionPeriodo'] as Record<string, unknown> | undefined;

  return {
    team: {
      id: String(team['id'] ?? ''),
      name: readString(team['name']),
      surname: readString(team['surname']),
      dni: readString(team['dni']),
      salary: readNumber(team['salary']),
    },
    calendar: {
      month: readNumber(calendar['month']),
      year: readNumber(calendar['year']),
      daysInMonth: readNumber(calendar['daysInMonth'] ?? calendar['days_in_month']),
      period: readString(calendar['period'], 'full') as PayrollData['calendar']['period'],
      periodLabel: readString(calendar['periodLabel'] ?? calendar['period_label']),
    },
    rates: {
      dailyRate: readNumber(rates['dailyRate'] ?? rates['daily_rate']),
      halfMonthReference: readNumber(
        rates['halfMonthReference'] ?? rates['half_month_reference'],
      ),
    },
    attendanceVista: adaptAttendanceSlice(r['attendanceVista'] ?? r['attendance_vista']),
    attendanceMesCompleto: adaptAttendanceSlice(
      r['attendanceMesCompleto'] ?? r['attendance_mes_completo'],
    ),
    movementsMonth: adaptMovements(r['movementsMonth'] ?? r['movements_month']),
    movementsQuincena1: adaptMovements(r['movementsQuincena1'] ?? r['movements_quincena1']),
    movementsQuincena2: adaptMovements(r['movementsQuincena2'] ?? r['movements_quincena2']),
    movementsVistaPeriodo: adaptMovements(
      r['movementsVistaPeriodo'] ?? r['movements_vista_periodo'],
    ),
    paymentItems: ((r['paymentItems'] ?? r['payment_items'] ?? []) as unknown[]).map(
      adaptPaymentItem,
    ),
    estimates: {
      salarioBase: readNumber(estimates['salarioBase'] ?? estimates['salario_base']),
      descuentoAsistenciaMesCompleto: readNumber(
        estimates['descuentoAsistenciaMesCompleto'] ??
          estimates['descuento_asistencia_mes_completo'],
      ),
      salarioTrasDescuentoFaltas: readNumber(
        estimates['salarioTrasDescuentoFaltas'] ??
          estimates['salario_tras_descuento_faltas'],
      ),
      estimadoAPagarFinMes: readNumber(
        estimates['estimadoAPagarFinMes'] ?? estimates['estimado_a_pagar_fin_mes'],
      ),
      nota: readString(estimates['nota']),
    },
    liquidacionPeriodo: liq
      ? {
          period: readString(liq['period'], 'full') as PayrollPeriod,
          diasEnPeriodo: readNumber(liq['diasEnPeriodo'] ?? liq['dias_en_periodo']),
          proporcionSalarioPeriodo: readNumber(
            liq['proporcionSalarioPeriodo'] ?? liq['proporcion_salario_periodo'],
          ),
          descuentoAsistenciaEnAmbito: readNumber(
            liq['descuentoAsistenciaEnAmbito'] ?? liq['descuento_asistencia_en_ambito'],
          ),
          descuentoPorAusenciasEnAmbito: readNumber(
            liq['descuentoPorAusenciasEnAmbito'] ?? liq['descuento_por_ausencias_en_ambito'],
          ),
          descuentoPorTiempoNoCumplidoEnAmbito: readNumber(
            liq['descuentoPorTiempoNoCumplidoEnAmbito'] ??
              liq['descuento_por_tiempo_no_cumplido_en_ambito'],
          ),
          netoTrasFaltasPeriodo: readNumber(
            liq['netoTrasFaltasPeriodo'] ?? liq['neto_tras_faltas_periodo'],
          ),
          adelantosPeriodo: readNumber(liq['adelantosPeriodo'] ?? liq['adelantos_periodo']),
          pagosRegistradosPeriodo: readNumber(
            liq['pagosRegistradosPeriodo'] ?? liq['pagos_registrados_periodo'],
          ),
          descuentosManualesPeriodo: readNumber(
            liq['descuentosManualesPeriodo'] ?? liq['descuentos_manuales_periodo'],
          ),
          totalMovimientosSalida: readNumber(
            liq['totalMovimientosSalida'] ?? liq['total_movimientos_salida'],
          ),
          restanteEstimadoAlCierre: readNumber(
            liq['restanteEstimadoAlCierre'] ?? liq['restante_estimado_al_cierre'],
          ),
          fechaCierreLegible: readString(
            liq['fechaCierreLegible'] ?? liq['fecha_cierre_legible'],
          ),
        }
      : undefined,
  };
}

export function adaptPayrollResponse(raw: unknown): PayrollApiResponse {
  const r = raw as { success?: boolean; data?: unknown; team?: unknown };
  const payload = r.data ?? (r.team ? r : undefined);
  return {
    success: Boolean(r.success ?? true),
    data: adaptPayrollData(payload ?? {}),
  };
}

export function adaptPaymentItemResponse(raw: unknown): PayrollPaymentItem {
  const r = raw as { data?: unknown };
  return adaptPaymentItem(r.data ?? raw);
}
