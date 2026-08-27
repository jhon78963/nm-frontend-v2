import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { DateInputComponent } from '../../../../../shared/ui/date-input/date-input.component';
import { FileDropzoneComponent } from '../../../../../shared/ui/file-dropzone/file-dropzone.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { SelectComponent } from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import {
  TableDataColumn,
  TableDataComponent,
  TableDataEmptyState,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/table-data/table-data.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { PayrollService } from '../../data-access/payroll.service';
import { TeamService } from '../../data-access/team.service';
import {
  PayrollData,
  PayrollPaymentItem,
  PayrollPeriod,
  PayrollQuincena,
  PaymentType,
} from '../../models/payroll.model';
import { Team } from '../../models/team.model';
import {
  formatDateTimeForApi,
  formatMoney,
  formatShortDate,
  MONTH_NAMES_ES,
  splitTimeLabel,
  toAccountingMonth,
} from '../../utils/team-format.util';

@Component({
  selector: 'app-team-payroll',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialogComponent, InputComponent, DateInputComponent, MoneyInputComponent, SelectComponent, CheckboxComponent, FileDropzoneComponent, ButtonComponent, TableActionButtonComponent, TableDataComponent, DtCellDirective, DtExpandCellComponent, DtRowDirective],
  templateUrl: './team-payroll.component.html',
})
export class TeamPayrollComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);
  private readonly payrollService = inject(PayrollService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly teamId = signal('');
  protected readonly team = signal<Team | null>(null);
  protected readonly viewMonth = signal(new Date().getMonth());
  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly period = signal<PayrollPeriod>('full');
  protected readonly loading = signal(true);
  protected readonly data = signal<PayrollData | null>(null);
  protected readonly savingPayment = signal(false);
  protected readonly deletingPaymentId = signal<string | null>(null);
  protected readonly deleteConfirmItem = signal<PayrollPaymentItem | null>(null);
  protected readonly editingPayment = signal<PayrollPaymentItem | null>(null);
  protected readonly voucherFiles = signal<File[]>([]);

  protected readonly periodOptions = [
    { label: 'Mes completo', value: 'full' as PayrollPeriod },
    { label: '1.ª quincena (1–15)', value: 'q1' as PayrollPeriod },
    { label: '2.ª quincena (16–fin)', value: 'q2' as PayrollPeriod },
  ];

  protected readonly paymentTypeOptions = [
    { label: 'Pago quincenal (cierre)', value: 'PAYMENT' as PaymentType },
    { label: 'Adelanto', value: 'ADVANCE' as PaymentType },
    { label: 'Descuento manual', value: 'DEDUCTION' as PaymentType },
  ];

  protected readonly paymentMethodOptions = [
    { label: 'Efectivo', value: 'CASH' },
    { label: 'Yape/Plin', value: 'YAPE' },
    { label: 'Tarjeta', value: 'CARD' },
    { label: 'Transferencia', value: 'TRANSFER' },
  ];

  protected readonly payrollQuincenaOptions = [
    { label: 'Cierre 1–15 del mes', value: 'q1' as PayrollQuincena },
    { label: 'Cierre 16–fin de mes', value: 'q2' as PayrollQuincena },
  ];

  protected readonly paymentForm = new FormGroup({
    type: new FormControl<PaymentType>('PAYMENT', { nonNullable: true }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: new FormControl(this.todayIsoDate(), { nonNullable: true }),
    accountingMonth: new FormControl(toAccountingMonth(new Date()), { nonNullable: true }),
    payrollPeriod: new FormControl<PayrollQuincena>('q2', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    paymentMethod: new FormControl('CASH', { nonNullable: true }),
    syncCashMovement: new FormControl(true, { nonNullable: true }),
  });

  protected readonly monthTitle = computed(
    () => `${MONTH_NAMES_ES[this.viewMonth()]} ${this.viewYear()}`,
  );

  protected readonly heroTitle = computed(() => {
    const liq = this.data()?.liquidacionPeriodo;
    if (!liq) return 'Restante estimado · fin de mes';
    if (liq.period === 'full') return 'Restante estimado · cierre de mes';
    return `Restante estimado · cierre ${liq.fechaCierreLegible}`;
  });

  protected readonly heroAmount = computed(() => {
    const liq = this.data()?.liquidacionPeriodo?.restanteEstimadoAlCierre;
    if (liq !== undefined && liq !== null) return liq;
    return this.data()?.estimates.estimadoAPagarFinMes ?? 0;
  });

  protected readonly paymentItems = computed(
    () => this.data()?.paymentItems ?? [],
  );

  protected readonly isEditingPayment = computed(() => this.editingPayment() !== null);

  protected readonly tableColumns: TableDataColumn<PayrollPaymentItem>[] = [
    { key: 'date', label: 'Fecha' },
    { key: 'type', label: 'Tipo', mobilePrimary: true },
    { key: 'period', label: 'Quincena' },
    { key: 'amount', label: 'Monto', align: 'right' },
    { key: 'actions', label: '', align: 'right', className: 'w-24' },
  ];

  protected readonly emptyState: TableDataEmptyState = {
    title: 'Sin movimientos',
    description: 'No hay movimientos registrados en este periodo.',
  };

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('teamId');
        if (!id) {
          this.toastService.show('error', 'No se indicó un colaborador válido.');
          void this.router.navigate(['/directories/teams']);
          return;
        }
        this.teamId.set(id);
        this.loadTeam();
        this.loadPayroll();
      });

    this.paymentForm.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        if (type === 'DEDUCTION') {
          this.paymentForm.controls.syncCashMovement.setValue(false);
        } else {
          this.paymentForm.controls.syncCashMovement.setValue(true);
        }
      });
  }

  protected goBack(): void {
    void this.router.navigate(['/directories/teams']);
  }

  protected goAttendance(): void {
    void this.router.navigate(['/directories/teams/asistencia', this.teamId()]);
  }

  protected prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.syncAccountingMonth();
    this.loadPayroll();
  }

  protected nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.syncAccountingMonth();
    this.loadPayroll();
  }

  protected onPeriodChange(value: string): void {
    this.period.set(value === 'q1' || value === 'q2' || value === 'full' ? value : 'full');
    this.loadPayroll();
  }

  protected money(value: number | null | undefined): string {
    return formatMoney(value);
  }

  protected splitTime(block: { days: number; hours: number; minutes: number } | null | undefined): string {
    return splitTimeLabel(block);
  }

  protected formatDate(ymd: string): string {
    return formatShortDate(ymd);
  }

  protected onVoucherFilesChange(files: File[]): void {
    this.voucherFiles.set(files);
  }

  protected submitPayment(): void {
    if (this.savingPayment()) {
      return;
    }
    this.savingPayment.set(true);

    this.paymentForm.markAllAsTouched();
    const amount = this.paymentForm.controls.amount.value;
    if (!amount || amount <= 0) {
      this.savingPayment.set(false);
      this.toastService.show('error', 'Indica un monto válido.');
      return;
    }

    const form = this.paymentForm.getRawValue();
    const date = new Date(`${form.date}T12:00:00`);
    const editing = this.editingPayment();

    if (editing) {
      this.payrollService
        .updatePayment(editing.id, {
          type: form.type,
          amount,
          date: formatDateTimeForApi(date),
          description: form.description,
          paymentMethod: form.paymentMethod,
          payrollPeriod: form.payrollPeriod,
          accountingMonth: form.accountingMonth,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingPayment.set(false);
            this.toastService.show('success', 'Movimiento actualizado.');
            this.cancelEditPayment();
            this.loadPayroll();
          },
          error: (err: unknown) => {
            this.savingPayment.set(false);
            this.toastService.show(
              'error',
              typeof err === 'string' ? err : 'No se pudo actualizar el movimiento.',
            );
          },
        });
      return;
    }

    this.payrollService
      .registerPayment({
        teamId: this.teamId(),
        type: form.type,
        amount,
        date: formatDateTimeForApi(date),
        description: form.description,
        paymentMethod: form.paymentMethod,
        payrollPeriod: form.payrollPeriod,
        accountingMonth: form.accountingMonth,
        syncCashMovement: form.syncCashMovement,
        images: this.voucherFiles(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPayment.set(false);
          this.toastService.show(
            'success',
            form.syncCashMovement
              ? 'Movimiento guardado y reflejado en gastos administrativos.'
              : 'Movimiento de nómina guardado.',
          );
          this.resetPaymentForm();
          this.loadPayroll();
        },
        error: (err: unknown) => {
          this.savingPayment.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo registrar el movimiento.',
          );
        },
      });
  }

  protected openEditPayment(item: PayrollPaymentItem): void {
    this.editingPayment.set(item);
    this.paymentForm.reset({
      type: item.type,
      amount: item.amount,
      date: item.date.slice(0, 10),
      accountingMonth: item.accountingMonth ?? toAccountingMonth(
        new Date(this.viewYear(), this.viewMonth(), 1),
      ),
      payrollPeriod: item.payrollPeriod,
      description: item.description ?? '',
      paymentMethod: item.paymentMethod ?? 'CASH',
      syncCashMovement: false,
    });
    this.voucherFiles.set([]);
  }

  protected cancelEditPayment(): void {
    this.editingPayment.set(null);
    this.resetPaymentForm();
  }

  protected openDeleteConfirm(item: PayrollPaymentItem): void {
    this.deleteConfirmItem.set(item);
  }

  protected cancelDelete(): void {
    this.deleteConfirmItem.set(null);
  }

  protected confirmDelete(): void {
    const item = this.deleteConfirmItem();
    if (!item) return;

    this.deletingPaymentId.set(item.id);
    this.payrollService
      .deletePayment(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingPaymentId.set(null);
          this.deleteConfirmItem.set(null);
          if (this.editingPayment()?.id === item.id) {
            this.cancelEditPayment();
          }
          this.toastService.show('success', 'Movimiento eliminado.');
          this.loadPayroll();
        },
        error: (err: unknown) => {
          this.deletingPaymentId.set(null);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar el movimiento.',
          );
        },
      });
  }

  protected paymentTypeClass(type: PaymentType): string {
    const map: Record<PaymentType, string> = {
      PAYMENT: 'bg-sky-50 text-sky-700 ring-sky-200',
      ADVANCE: 'bg-amber-50 text-amber-700 ring-amber-200',
      DEDUCTION: 'bg-red-50 text-red-700 ring-red-200',
    };
    return map[type];
  }

  private loadTeam(): void {
    this.teamService
      .getOne(this.teamId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (team) => this.team.set(team),
        error: () => {
          this.toastService.show('info', 'No se pudo cargar el perfil del colaborador.');
        },
      });
  }

  private loadPayroll(): void {
    this.loading.set(true);
    this.payrollService
      .getPayroll(this.teamId(), this.viewMonth() + 1, this.viewYear(), this.period())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.data.set(null);
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la vista de pagos.');
        },
      });
  }

  private resetPaymentForm(): void {
    const period = this.period();
    this.editingPayment.set(null);
    this.paymentForm.reset({
      type: 'PAYMENT',
      amount: null,
      date: this.todayIsoDate(),
      accountingMonth: toAccountingMonth(
        new Date(this.viewYear(), this.viewMonth(), 1),
      ),
      payrollPeriod: period === 'q1' ? 'q1' : 'q2',
      description: '',
      paymentMethod: 'CASH',
      syncCashMovement: true,
    });
    this.voucherFiles.set([]);
  }

  private syncAccountingMonth(): void {
    this.paymentForm.controls.accountingMonth.setValue(
      toAccountingMonth(new Date(this.viewYear(), this.viewMonth(), 1)),
    );
  }

  private todayIsoDate(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
}
