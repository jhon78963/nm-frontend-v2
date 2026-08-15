import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import {
  TableDataColumn,
  TableDataComponent,
} from '../../../../../shared/ui/table-data/table-data.component';
import { AttendanceService } from '../../data-access/attendance.service';
import { TeamService } from '../../data-access/team.service';
import {
  AttendanceDayRow,
  AttendanceRecord,
  AttendanceStats,
  AttendanceStatus,
  QuincenaView,
} from '../../models/attendance.model';
import { Team } from '../../models/team.model';
import {
  applyRecordToRow,
  buildMonthRows,
  calculateDelayForRow,
  domingoRecuperaStorageKey,
  quincenaDayRange,
  quincenaViewStorageKey,
  readLocalStorageMap,
  recalcStats,
  showTimesForStatus,
  valdeoNthStorageKey,
} from '../../utils/attendance-calc.util';
import {
  ATTENDANCE_STATUS_OPTIONS,
  MONTH_NAMES_ES,
  QUINCENA_OPTIONS,
  VALDEO_NTH_OPTIONS,
} from '../../utils/team-format.util';

@Component({
  selector: 'app-team-attendance',
  imports: [RouterLink, FormsModule, InputComponent, SelectComponent, ButtonComponent, CheckboxComponent, TableActionButtonComponent, TableDataComponent],
  templateUrl: './team-attendance.component.html',
})
export class TeamAttendanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly teamId = signal(0);
  protected readonly team = signal<Team | null>(null);
  protected readonly loading = signal(true);
  protected readonly viewMonth = signal(new Date().getMonth());
  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly monthRows = signal<AttendanceDayRow[]>([]);
  protected readonly stats = signal<AttendanceStats>(this.emptyStats());
  protected readonly quincenaView = signal<QuincenaView>('full');
  protected readonly valdeoWednesdayNth = signal<1 | 2>(1);

  protected readonly statusOptions: SelectOption<string>[] = [...ATTENDANCE_STATUS_OPTIONS];
  protected readonly quincenaOptions = QUINCENA_OPTIONS;
  protected readonly valdeoNthOptions: SelectOption<number>[] = [...VALDEO_NTH_OPTIONS];

  protected readonly attendanceTableColumns: TableDataColumn<AttendanceDayRow>[] = [
    { key: 'day', label: 'Día' },
    { key: 'weekday', label: 'Sem.' },
    { key: 'status', label: 'Estado' },
    { key: 'checkIn', label: 'Entrada' },
    { key: 'checkOut', label: 'Salida' },
    { key: 'delay', label: 'Tarde (min)' },
    { key: 'note', label: 'Observación' },
    { key: 'hasRecord', label: 'Servidor', align: 'center' },
    { key: 'actions', label: '', align: 'right' },
  ];

  private attendanceCache: Record<string, AttendanceRecord> = {};
  private domingoRecuperaMap: Record<string, boolean> = {};
  private loadedMonthKey = '';

  protected readonly monthTitle = computed(
    () => `${MONTH_NAMES_ES[this.viewMonth()]} ${this.viewYear()}`,
  );

  protected readonly visibleMonthRows = computed(() => {
    const { start, end } = quincenaDayRange(
      this.viewMonth(),
      this.viewYear(),
      this.quincenaView(),
    );
    return this.monthRows().filter((r) => r.day >= start && r.day <= end);
  });

  protected readonly quincenaLabel = computed(() => {
    const view = this.quincenaView();
    if (view === 'q1') return '1ª quincena (días 1–15)';
    if (view === 'q2') {
      const last = new Date(this.viewYear(), this.viewMonth() + 1, 0).getDate();
      return `2ª quincena (días 16–${last})`;
    }
    return 'Mes completo';
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = Number(params.get('teamId'));
        if (!id || Number.isNaN(id)) {
          this.toastService.show('error', 'No se indicó un colaborador válido.');
          void this.router.navigate(['/directories/teams']);
          return;
        }
        this.teamId.set(id);
        this.loadTeam();
        this.loadAttendanceMonth();
      });
  }

  protected goBack(): void {
    void this.router.navigate(['/directories/teams']);
  }

  protected goPayments(): void {
    void this.router.navigate(['/directories/teams/pagos', this.teamId()]);
  }

  protected prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
    this.loadAttendanceMonth();
  }

  protected nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    this.loadAttendanceMonth();
  }

  protected onQuincenaChange(value: string): void {
    this.quincenaView.set(
      value === 'q1' || value === 'q2' || value === 'full' ? value : 'full',
    );
    localStorage.setItem(this.quincenaKey(), this.quincenaView());
    this.refreshDerivedState();
  }

  protected onValdeoNthChange(value: number | null): void {
    if (value !== 1 && value !== 2) {
      return;
    }

    this.valdeoWednesdayNth.set(value);
    localStorage.setItem(this.valdeoKey(), String(this.valdeoWednesdayNth()));
    this.rebuildRows();
  }

  protected onStatusChange(row: AttendanceDayRow): void {
    if (row.isSunday && row.status !== 'DESCANSO' && row.status !== 'VACACIONES') {
      this.toastService.show('info', 'Los domingos suelen registrarse como descanso fijo.');
    }
    calculateDelayForRow(row, false);
    this.monthRows.set([...this.monthRows()]);
  }

  protected onTimeChange(row: AttendanceDayRow): void {
    calculateDelayForRow(row, true);
    this.monthRows.set([...this.monthRows()]);
  }

  protected onDomingoRecuperaChange(row: AttendanceDayRow): void {
    const map = { ...this.domingoRecuperaMap };
    if (row.domingoTrabajoRecuperacion) {
      map[row.dateStr] = true;
    } else {
      delete map[row.dateStr];
    }
    this.domingoRecuperaMap = map;
    localStorage.setItem(this.domingoKey(), JSON.stringify(map));
    this.refreshDerivedState();
  }

  protected showTimesFor(row: AttendanceDayRow): boolean {
    return showTimesForStatus(row.status);
  }

  protected saveRow(row: AttendanceDayRow): void {
    calculateDelayForRow(row, true);

    row.saving = true;
    this.monthRows.set([...this.monthRows()]);

    this.attendanceService
      .store({
        teamId: this.teamId(),
        date: row.dateStr,
        status: row.status,
        checkInTime: row.checkInTime || null,
        checkOutTime: row.checkOutTime || null,
        delayMinutes: row.delayMinutes,
        notes: row.note,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          row.saving = false;
          row.hasRecord = true;
          this.attendanceCache[row.dateStr] = record;
          applyRecordToRow(row, record);
          this.monthRows.set([...this.monthRows()]);
          this.refreshDerivedState();
          this.toastService.show('success', `${row.dateStr} actualizado.`);
        },
        error: (err: unknown) => {
          row.saving = false;
          this.monthRows.set([...this.monthRows()]);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo guardar la asistencia.',
          );
        },
      });
  }

  protected onRowStatusChange(row: AttendanceDayRow, status: AttendanceStatus | null): void {
    if (!status) {
      return;
    }

    row.status = status;
    this.onStatusChange(row);
  }

  private loadTeam(): void {
    this.teamService
      .getOne(this.teamId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (team) => this.team.set(team),
        error: () => {
          this.toastService.show('info', 'No se pudo cargar el nombre del colaborador.');
        },
      });
  }

  private loadAttendanceMonth(): void {
    this.loadValdeoNthForMonth();
    this.loadQuincenaViewForMonth();
    this.domingoRecuperaMap = readLocalStorageMap(this.domingoKey());

    const key = `${this.viewYear()}-${this.viewMonth()}`;
    if (this.loadedMonthKey === key) {
      this.rebuildRows();
      return;
    }

    this.loading.set(true);
    this.attendanceService
      .getByMonth(this.teamId(), this.viewMonth() + 1, this.viewYear())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.attendanceCache = res.records;
          this.loadedMonthKey = key;
          this.rebuildRows();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar el mes.');
        },
      });
  }

  private rebuildRows(): void {
    this.monthRows.set(
      buildMonthRows({
        viewMonth: this.viewMonth(),
        viewYear: this.viewYear(),
        valdeoWednesdayNth: this.valdeoWednesdayNth(),
        attendanceCache: this.attendanceCache,
        domingoRecuperaMap: this.domingoRecuperaMap,
      }),
    );
    this.refreshDerivedState();
  }

  private refreshDerivedState(): void {
    this.stats.set(
      recalcStats({
        viewMonth: this.viewMonth(),
        viewYear: this.viewYear(),
        quincenaView: this.quincenaView(),
        attendanceCache: this.attendanceCache,
        domingoRecuperaMap: this.domingoRecuperaMap,
      }),
    );
  }

  private loadValdeoNthForMonth(): void {
    const raw = localStorage.getItem(this.valdeoKey());
    this.valdeoWednesdayNth.set(raw === '2' ? 2 : 1);
  }

  private loadQuincenaViewForMonth(): void {
    const raw = localStorage.getItem(this.quincenaKey());
    this.quincenaView.set(raw === 'q1' || raw === 'q2' || raw === 'full' ? raw : 'full');
  }

  private valdeoKey(): string {
    return valdeoNthStorageKey(this.viewYear(), this.viewMonth());
  }

  private quincenaKey(): string {
    return quincenaViewStorageKey(this.teamId(), this.viewYear(), this.viewMonth());
  }

  private domingoKey(): string {
    return domingoRecuperaStorageKey(this.teamId(), this.viewYear(), this.viewMonth());
  }

  private emptyStats(): AttendanceStats {
    return {
      puntual: 0,
      tolerancia: 0,
      tarde: 0,
      falta: 0,
      faltaInjustificada: 0,
      descanso: 0,
      vacaciones: 0,
      recuperacion: 0,
      valdeo: 0,
      domingosEnPeriodo: 0,
      domingoTrabajoRecuperacion: 0,
    };
  }
}
