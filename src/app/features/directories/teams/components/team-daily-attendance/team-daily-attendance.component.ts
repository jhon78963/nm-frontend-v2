import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttendanceService } from '../../data-access/attendance.service';
import { DailyAttendanceRow } from '../../models/attendance.model';
import {
  attendanceStatusLabel,
  attendanceStatusTone,
  toIsoDate,
} from '../../utils/team-format.util';

@Component({
  selector: 'app-team-daily-attendance',
  templateUrl: './team-daily-attendance.component.html',
})
export class TeamDailyAttendanceComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();

  protected readonly selectedDate = signal(toIsoDate(new Date()));
  protected readonly loading = signal(false);
  protected readonly rows = signal<DailyAttendanceRow[]>([]);

  protected readonly formattedDate = computed(() => {
    const parts = this.selectedDate().split('-').map(Number);
    if (parts.length !== 3) return this.selectedDate();
    const [y, m, d] = parts;
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.loadSummary();
  }

  protected goToday(): void {
    this.selectedDate.set(toIsoDate(new Date()));
    this.loadSummary();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected statusLabel(status: string): string {
    return attendanceStatusLabel(status);
  }

  protected statusTone(status: string | null | undefined) {
    return attendanceStatusTone(status);
  }

  protected summaryLine(row: DailyAttendanceRow): string {
    const fullName = `${row.name} ${row.surname}`.trim();
    if (!row.attendance) {
      return `${fullName}: sin registro de asistencia.`;
    }
    const a = row.attendance;
    const parts: string[] = [this.statusLabel(a.status)];
    if (a.checkInTime) parts.push(`entrada ${a.checkInTime}`);
    if (a.checkOutTime) parts.push(`salida ${a.checkOutTime}`);
    if (a.delayMinutes > 0) parts.push(`+${a.delayMinutes} min vs 8:00`);
    return `${fullName}: ${parts.join(' · ')}.`;
  }

  protected badgeClass(tone: ReturnType<typeof attendanceStatusTone>): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      info: 'bg-sky-50 text-sky-700 ring-sky-200',
      warning: 'bg-amber-50 text-amber-700 ring-amber-200',
      danger: 'bg-red-50 text-red-700 ring-red-200',
      neutral: 'bg-gray-50 text-gray-600 ring-gray-200',
    };
    return map[tone] ?? map['neutral'];
  }

  private loadSummary(): void {
    const date = this.selectedDate();
    if (!date) return;

    this.loading.set(true);
    this.attendanceService
      .getDailySummary(date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.rows.set([]);
          this.loading.set(false);
        },
      });
  }
}
