import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../../../shared/ui/checkbox/checkbox.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { RoleService } from '../../data-access/role.service';
import { Permission } from '../../models/role.model';
import {
  buildPermissionTree,
  filterPermissionTree,
  PermissionModule,
} from '../../utils/permission-options';

@Component({
  selector: 'app-role-form',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roleId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);

  protected readonly permissionsSearch = signal('');

  protected readonly permissionsSearchControl = new FormControl('', { nonNullable: true });

  protected allPermissions: Permission[] = [];
  protected permissionTree = signal<PermissionModule[]>([]);
  protected readonly filteredTree = computed(() =>
    filterPermissionTree(this.permissionTree(), this.permissionsSearch()),
  );

  protected readonly selected = signal(new Set<string>());
  protected readonly selectedCount = computed(() => this.selected().size);

  protected readonly expandedModules = signal(new Set<string>());

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required, Validators.minLength(2)],
      nonNullable: true,
    }),
  });

  protected readonly isEditing = computed(() => this.roleId() !== null);

  protected readonly nameError = computed(() => {
    const ctrl = this.form.controls.name;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'El nombre es requerido.';
    if (ctrl.hasError('minlength')) return 'Mínimo 2 caracteres.';
    return '';
  });

  ngOnInit(): void {
    this.permissionsSearchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onPermissionsSearchValue(value));

    const id = this.roleId();
    if (id !== null) {
      forkJoin({
        perms: this.roleService.getPermissions(),
        role: this.roleService.getOne(id),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ perms, role }) => {
            this.allPermissions = perms;
            this.permissionTree.set(buildPermissionTree(perms));
            this.form.controls.name.setValue(role.name);
            this.selected.set(new Set((role.permissions ?? []).map((p) => p.name)));
            this.loadingData.set(false);
          },
          error: () => {
            this.loadingData.set(false);
            this.closed.emit();
          },
        });
    } else {
      this.roleService
        .getPermissions()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (perms) => {
            this.allPermissions = perms;
            this.permissionTree.set(buildPermissionTree(perms));
            this.loadingData.set(false);
          },
          error: () => {
            this.loadingData.set(false);
          },
        });
    }
  }

  protected onPermissionsSearchValue(value: string): void {
    this.permissionsSearch.set(value);
    if (value.trim()) {
      const allIds = new Set(this.filteredTree().map((m) => m.id));
      this.expandedModules.set(allIds);
    }
  }

  protected isPermissionSelected(name: string): boolean {
    return this.selected().has(name);
  }

  protected setPermission(name: string, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }

  protected onModuleCheckboxChange(module: PermissionModule, checked: boolean): void {
    const names = module.submodules.flatMap((s) => s.permissions.map((p) => p.value));
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) {
        names.forEach((n) => next.add(n));
      } else {
        names.forEach((n) => next.delete(n));
      }
      return next;
    });
  }

  protected permissionLabel(perm: { actionLabel: string; value: string }): string {
    return `${perm.actionLabel} · ${perm.value}`;
  }

  protected moduleState(module: PermissionModule): 'all' | 'some' | 'none' {
    const names = module.submodules.flatMap((s) => s.permissions.map((p) => p.value));
    const selectedCount = names.filter((n) => this.selected().has(n)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === names.length) return 'all';
    return 'some';
  }

  protected isModuleExpanded(id: string): boolean {
    return this.expandedModules().has(id);
  }

  protected toggleModuleExpanded(id: string): void {
    this.expandedModules.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected moduleSelectedCount(module: PermissionModule): number {
    return module.submodules
      .flatMap((s) => s.permissions)
      .filter((p) => this.selected().has(p.value)).length;
  }

  protected moduleTotalCount(module: PermissionModule): number {
    return module.submodules.flatMap((s) => s.permissions).length;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    const name = this.form.controls.name.value.trim();
    const permissions = [...this.selected()];
    const id = this.roleId();

    const request$ =
      id !== null
        ? this.roleService.update(id, { name, permissions })
        : this.roleService.create({ name, permissions });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit(
          id !== null ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.',
        );
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
