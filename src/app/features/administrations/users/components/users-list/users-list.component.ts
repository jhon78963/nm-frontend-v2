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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableEmptyState,
  DataTablePagination,
} from '../../../../../shared/ui/data-table/data-table.component';
import { DtCellDirective } from '../../../../../shared/ui/data-table/dt-cell.directive';
import { DtExpandCellComponent } from '../../../../../shared/ui/data-table/dt-expand-cell.component';
import { DtRowDirective } from '../../../../../shared/ui/data-table/dt-row.directive';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TableActionsComponent } from '../../../../../shared/ui/table-actions/table-actions.component';
import { ToastService } from '../../../../../shared/ui/toast/toast.service';
import { UserService } from '../../data-access/user.service';
import { User } from '../../models/user.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserPasswordResetComponent } from '../user-password-reset/user-password-reset.component';

@Component({
  selector: 'app-users-list',
  imports: [
    ReactiveFormsModule,
    UserFormComponent,
    UserPasswordResetComponent,
    ConfirmDialogComponent,
    DataTableComponent,
    DtCellDirective,
    DtExpandCellComponent,
    DtRowDirective,
    TableActionButtonComponent,
    TableActionsComponent,
  ],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly users = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);

  protected readonly formDialogOpen = signal(false);
  protected readonly editingUserId = signal<number | null>(null);

  protected readonly passwordResetOpen = signal(false);
  protected readonly passwordResetUser = signal<User | null>(null);

  protected readonly disableConfirmId = signal<number | null>(null);
  protected readonly disabling = signal(false);

  protected readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly disableTargetLabel = computed(() => {
    const id = this.disableConfirmId();
    if (id === null) return '';
    const user = this.users().find((u) => u.id === id);
    return user ? `${user.username} (${user.name} ${user.surname})` : '';
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
    title: 'Aún no hay usuarios registrados',
    description: 'Crea el primero haciendo clic en «Nuevo usuario».',
    actionLabel: 'Nuevo usuario',
  }));

  protected readonly tableColumns = signal<DataTableColumn<User>[]>([
    { key: 'user', label: 'Usuario', align: 'left', mobilePrimary: true },
    { key: 'fullName', label: 'Nombre completo', align: 'left' },
    { key: 'role', label: 'Rol', align: 'left' },
    { key: 'status', label: 'Estado', align: 'left' },
    { key: 'actions', label: 'Acciones', align: 'right', width: '120px' },
  ]);

  ngOnInit(): void {
    this.loadUsers();

    this.searchForm.controls.search.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.currentSearch.set(value);
        this.page.set(1);
        this.loadUsers();
      });
  }

  protected loadUsers(): void {
    this.loading.set(true);
    this.userService
      .getAll({
        limit: this.limit(),
        page: this.page(),
        search: this.currentSearch(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.paginate.total);
          this.totalPages.set(res.paginate.pages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.show('error', 'No se pudo cargar la lista de usuarios.');
        },
      });
  }

  protected goToPage(p: number | '...'): void {
    if (p === '...' || p === this.page()) return;
    this.page.set(p);
    this.loadUsers();
  }

  protected openCreate(): void {
    this.editingUserId.set(null);
    this.formDialogOpen.set(true);
  }

  protected openEdit(id: number): void {
    this.editingUserId.set(id);
    this.formDialogOpen.set(true);
  }

  protected openPasswordReset(user: User): void {
    this.passwordResetUser.set(user);
    this.passwordResetOpen.set(true);
  }

  protected openDisableConfirm(id: number): void {
    this.disableConfirmId.set(id);
  }

  protected cancelDisable(): void {
    this.disableConfirmId.set(null);
  }

  protected confirmDisable(): void {
    const id = this.disableConfirmId();
    if (id === null) return;

    this.disabling.set(true);
    this.userService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.disableConfirmId.set(null);
          this.disabling.set(false);
          this.toastService.show('success', 'Usuario deshabilitado correctamente.');
          this.loadUsers();
        },
        error: () => {
          this.disabling.set(false);
          this.disableConfirmId.set(null);
          this.toastService.show('error', 'No se pudo deshabilitar el usuario.');
        },
      });
  }

  protected onFormSaved(message: string): void {
    this.formDialogOpen.set(false);
    this.toastService.show('success', message);
    this.loadUsers();
  }

  protected onFormClosed(): void {
    this.formDialogOpen.set(false);
  }

  protected onPasswordResetSaved(message: string): void {
    this.passwordResetOpen.set(false);
    this.passwordResetUser.set(null);
    this.toastService.show('success', message);
  }

  protected onPasswordResetClosed(): void {
    this.passwordResetOpen.set(false);
    this.passwordResetUser.set(null);
  }

  protected clearSearch(): void {
    this.searchForm.controls.search.setValue('');
  }

  protected fullName(user: User): string {
    return `${user.name} ${user.surname}`.trim();
  }
}
