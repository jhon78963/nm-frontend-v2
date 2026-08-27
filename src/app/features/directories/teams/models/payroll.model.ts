export type PayrollPeriod = 'full' | 'q1' | 'q2';
export type PayrollQuincena = 'q1' | 'q2';
export type PaymentType = 'PAYMENT' | 'ADVANCE' | 'DEDUCTION';
export type SaldoSentido = 'favor' | 'debe' | 'cero';

export interface PayrollTardanza {
  days: number;
  hours: number;
  minutes: number;
}

export interface PayrollDeudaDia {
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  deudaEntradaTardeMinutos: number;
  deudaSalidaAnticipadaMinutos: number;
  favorLlegadaTempranaMinutos: number;
  favorSalidaTardeMinutos: number;
  saldoNetoMinutos: number;
  saldoNetoSentido: SaldoSentido;
}

export interface PayrollAttendanceSlice {
  falta: number;
  faltaInjustificada: number;
  valdeo: number;
  recuperacion: number;
  faltasEquivalentes: number;
  faltasADescontar: number;
  descuentoPorAusencias: number;
  descuentoPorTiempoNoCumplido: number;
  descuentoPorFaltas: number;
  diasConRetraso: number;
  deudaEntradaTardeMinutos: number;
  deudaSalidaAnticipadaMinutos: number;
  deudaTiempoTotalMinutos: number;
  favorLlegadaTempranaTotalMinutos: number;
  favorSalidaTardeTotalMinutos: number;
  favorTiempoTotalMinutos: number;
  saldoTiempoNetoMinutos: number;
  saldoTiempoNetoSentido: SaldoSentido;
  saldoTiempoNetoMagnitud: PayrollTardanza;
  deudaEntradaTarde: PayrollTardanza;
  deudaSalidaAnticipada: PayrollTardanza;
  deudaTiempo: PayrollTardanza;
  favorLlegadaTemprana: PayrollTardanza;
  favorSalidaTarde: PayrollTardanza;
  deudaPorDia: PayrollDeudaDia[];
}

export interface PayrollMovements {
  advances: number;
  payments: number;
  deductions: number;
}

export interface PayrollPaymentItem {
  id: string;
  type: PaymentType;
  typeLabel: string;
  amount: number;
  date: string;
  payrollPeriod: PayrollQuincena;
  payrollPeriodLabel: string;
  accountingMonth: string | null;
  accountingPeriodLabel: string | null;
  description: string | null;
  syncedToAdmin: boolean;
  cashMovementId: string | null;
  paymentMethod: string | null;
  voucherPath: string | null;
  voucherPaths: string[];
  adminExpenseDescription: string | null;
}

export interface PayrollEstimates {
  salarioBase: number;
  descuentoAsistenciaMesCompleto: number;
  salarioTrasDescuentoFaltas: number;
  estimadoAPagarFinMes: number;
  nota: string;
}

export interface PayrollLiquidacionPeriodo {
  period: PayrollPeriod;
  diasEnPeriodo: number;
  proporcionSalarioPeriodo: number;
  descuentoAsistenciaEnAmbito: number;
  descuentoPorAusenciasEnAmbito?: number;
  descuentoPorTiempoNoCumplidoEnAmbito?: number;
  netoTrasFaltasPeriodo: number;
  adelantosPeriodo: number;
  pagosRegistradosPeriodo: number;
  descuentosManualesPeriodo: number;
  totalMovimientosSalida: number;
  restanteEstimadoAlCierre: number;
  fechaCierreLegible: string;
}

export interface PayrollData {
  team: {
    id: string;
    name: string;
    surname: string;
    dni: string;
    salary: number;
  };
  calendar: {
    month: number;
    year: number;
    daysInMonth: number;
    period: PayrollPeriod;
    periodLabel: string;
  };
  rates: {
    dailyRate: number;
    halfMonthReference: number;
  };
  attendanceVista: PayrollAttendanceSlice;
  attendanceMesCompleto: PayrollAttendanceSlice;
  movementsMonth: PayrollMovements;
  movementsQuincena1: PayrollMovements;
  movementsQuincena2: PayrollMovements;
  movementsVistaPeriodo: PayrollMovements;
  paymentItems: PayrollPaymentItem[];
  estimates: PayrollEstimates;
  liquidacionPeriodo?: PayrollLiquidacionPeriodo;
}

export interface PayrollApiResponse {
  success: boolean;
  data: PayrollData;
}

export interface PaymentFormModel {
  type: PaymentType;
  amount: number | null;
  date: string;
  accountingMonth: string;
  payrollPeriod: PayrollQuincena;
  description: string;
  paymentMethod: string;
  syncCashMovement: boolean;
}
