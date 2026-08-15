import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
  DataTableEmptyState,
  DtCellDirective,
  DtExpandCellComponent,
  DtRowDirective,
} from '../../../../../shared/ui/data-table/data-table.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { TABLE_FILTER_KEYS } from '../../../../../core/table-filters/table-filter-keys';
import { TableFilterStorageService } from '../../../../../core/table-filters/table-filter-storage.service';
import {
  buildSearchPageFilterState,
  persistSearchPageFilters,
  restoreSearchPageFilters,
} from '../../../../../core/table-filters/table-filter-state.util';
import { TeamService } from '../../data-access/team.service';
import { Team } from '../../models/team.model';
import { formatMoney } from '../../utils/team-format.util';
import { TeamDailyAttendanceComponent } from '../team-daily-attendance/team-daily-attendance.component';
import { TeamFormComponent } from '../team-form/team-form.component';

const FILTER_STORAGE_KEY = TABLE_FILTER_KEYS.teams;

@Component({
  selector: 'app-teams-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TeamFormComponent,
    TeamDailyAttendanceComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './teams-list.component.html',
})
export class TeamsListComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly filterStorage = inject(TableFilterStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly teams = signal<Team[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingTeamId = signal<number | null>(null);
  protected readonly dailySummaryOpen = signal(false);

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
    if (id === null) return '';
    const team = this.teams().find((t) => t.id === id);
    return team ? `${team.name} ${team.surname}` : '';
  });

  protected readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  protected readonly firstTeamOnPage = computed(() => this.teams()[0] ?? null);

  protected readonly paginationData = computed<DataTablePagination | null>(() => {
    if (this.totalPages() <= 1) return null;
    return {
      currentPage: this.page(),
      totalPages: this.totalPages(),
      pageSize: this.limit(),
      totalItems: this.total(),
      pages: this.paginationPages(),
    };
  });

  protected readonly emptyState = computed<DataTableEmptyState>(() => ({
    icon: undefined as never,
    title: 'Aún no hay colaboradores registrados',
    description: 'Agrega la primera colaboradora para gestionar asistencia y nómina.',
    actionLabel: 'Nuevo colaborador',
  }));

  protected readonly tableColumns = signal<DataTableColumn<Team>[]>([
    { key: 'id', label: '#', align: 'left', width: '16' },
    { key: 'member', label: 'Colaborador', align: 'left', mobilePrimary: true },
    { key: 'dni', label: 'DNI', align: 'left' },
    { key: 'salary', label: 'Salario', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '140px' },
  ]);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadTeams();

    this.filterForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.persistFilters();
        this.loadTeams();
      });
  }

  protected loadTeams(): void {
    this.loading.set(true);
    this.teamService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.teams.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de colaboradores.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.persistFilters();
    this.loadTeams();
  }

  protected openCreate(): void {
    this.editingTeamId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingTeamId.set(id);
    this.formDialogOpen.set(true);
  }

  protected openDailySummary(): void {
    this.dailySummaryOpen.set(true);
  }

  protected closeDailySummary(): void {
    this.dailySummaryOpen.set(false);
  }

  protected openDeleteConfirm(id: number): void {
    this.deleteConfirmId.set(id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected confirmDelete(): void {
    const id = this.deleteConfirmId();
    if (id === null) return;

    this.deleting.set(true);
    this.teamService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Colaborador eliminado correctamente.');
          if (this.teams().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadTeams();
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string' ? err : 'No se pudo eliminar el colaborador.',
          );
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadTeams();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected clearSearch(): void {
    this.filterForm.controls.search.setValue('');
  }

  protected goAttendance(team: Team): void {
    void this.router.navigate(['/directories/teams/asistencia', team.id]);
  }

  protected goPayroll(team: Team): void {
    void this.router.navigate(['/directories/teams/pagos', team.id]);
  }

  protected formatSalary(salary: number | null): string {
    if (salary === null || salary === undefined) return '—';
    return `S/ ${formatMoney(salary)}`;
  }

  protected memberInitials(team: Team): string {
    const n = team.name.charAt(0).toUpperCase();
    const s = team.surname.charAt(0).toUpperCase();
    return `${n}${s}`;
  }

  private restoreFilters(): void {
    restoreSearchPageFilters(this.filterStorage, FILTER_STORAGE_KEY, {
      page: this.page,
      limit: this.limit,
      currentSearch: this.currentSearch,
      searchControl: this.filterForm.controls.search,
    });
  }

  private persistFilters(): void {
    persistSearchPageFilters(
      this.filterStorage,
      FILTER_STORAGE_KEY,
      buildSearchPageFilterState(
        this.page(),
        this.limit(),
        this.currentSearch(),
      ),
    );
  }
}
