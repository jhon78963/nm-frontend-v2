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

  protected readonly deleteConfirmId = signal<number | null>(null);
  protected readonly deleting = signal(false);

  protected readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  protected readonly currentSearch = signal('');

  protected readonly deleteTargetLabel = computed(() => {
    const id = this.deleteConfirmId();
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
    this.userService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteConfirmId.set(null);
          this.deleting.set(false);
          this.toastService.show('success', 'Usuario eliminado correctamente.');
          if (this.users().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadUsers();
        },
        error: () => {
          this.deleting.set(false);
          this.deleteConfirmId.set(null);
          this.toastService.show('error', 'No se pudo eliminar el usuario.');
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
