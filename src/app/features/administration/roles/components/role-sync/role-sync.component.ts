import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RoleService } from '../../data-access/role.service';
import {
  buildPermissionTree,
  countPermissions,
  filterPermissionTree,
  PermissionModule,
  PermissionSubmodule,
} from '../../utils/permission-options';

import { ToastService } from '../../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-role-sync',
  templateUrl: './role-sync.component.html',
})
export class RoleSyncComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly roleId = signal(0);
  protected readonly roleName = signal('');

  protected readonly permissionTree = signal<PermissionModule[]>([]);
  protected readonly totalPermissions = signal(0);
  protected readonly search = signal('');
  protected readonly filteredTree = computed(() =>
    filterPermissionTree(this.permissionTree(), this.search()),
  );

  protected readonly selected = signal(new Set<string>());
  protected readonly selectedCount = computed(() => this.selected().size);

  protected readonly expandedModules = signal(new Set<string>());

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      void this.router.navigate(['/administration/roles']);
      return;
    }

    this.roleId.set(id);

    forkJoin({
      perms: this.roleService.getPermissions(),
      role: this.roleService.getOne(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ perms, role }) => {
          const tree = buildPermissionTree(perms);
          this.permissionTree.set(tree);
          this.totalPermissions.set(countPermissions(tree));
          this.roleName.set(role.name);
          this.selected.set(new Set((role.permissions ?? []).map((p) => p.name)));
          this.expandedModules.set(new Set([tree[0]?.id ?? '']));
          this.loading.set(false);
        },
        error: () => {
          this.showToast('error', 'No se pudo cargar el rol.');
          void this.router.navigate(['/administration/roles']);
        },
      });
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    if (value.trim()) {
      this.expandedModules.set(
        new Set(this.filteredTree().map((m) => m.id)),
      );
    }
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected goBack(): void {
    void this.router.navigate(['/administration/roles']);
  }

  protected isPermissionSelected(name: string): boolean {
    return this.selected().has(name);
  }

  protected togglePermission(name: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected moduleState(module: PermissionModule): 'all' | 'some' | 'none' {
    const names = this.modulePermissionNames(module);
    const count = names.filter((n) => this.selected().has(n)).length;
    if (count === 0) return 'none';
    if (count === names.length) return 'all';
    return 'some';
  }

  protected toggleModule(module: PermissionModule): void {
    const names = this.modulePermissionNames(module);
    const state = this.moduleState(module);
    this.selected.update((set) => {
      const next = new Set(set);
      if (state === 'all') names.forEach((n) => next.delete(n));
      else names.forEach((n) => next.add(n));
      return next;
    });
  }

  protected submoduleState(submodule: PermissionSubmodule): 'all' | 'some' | 'none' {
    const names = submodule.permissions.map((p) => p.value);
    const count = names.filter((n) => this.selected().has(n)).length;
    if (count === 0) return 'none';
    if (count === names.length) return 'all';
    return 'some';
  }

  protected toggleSubmodule(submodule: PermissionSubmodule): void {
    const names = submodule.permissions.map((p) => p.value);
    const state = this.submoduleState(submodule);
    this.selected.update((set) => {
      const next = new Set(set);
      if (state === 'all') names.forEach((n) => next.delete(n));
      else names.forEach((n) => next.add(n));
      return next;
    });
  }

  protected moduleSelectedCount(module: PermissionModule): number {
    return this.modulePermissionNames(module).filter((n) =>
      this.selected().has(n),
    ).length;
  }

  protected moduleTotalCount(module: PermissionModule): number {
    return this.modulePermissionNames(module).length;
  }

  protected submoduleSelectedCount(submodule: PermissionSubmodule): number {
    return submodule.permissions.filter((p) => this.selected().has(p.value)).length;
  }

  protected isModuleExpanded(id: string): boolean {
    return this.expandedModules().has(id);
  }

  protected toggleModuleExpanded(id: string): void {
    this.expandedModules.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected expandAll(): void {
    this.expandedModules.set(new Set(this.filteredTree().map((m) => m.id)));
  }

  protected collapseAll(): void {
    this.expandedModules.set(new Set());
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);

    this.roleService
      .syncPermissions(this.roleId(), [...this.selected()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showToast('success', 'Permisos sincronizados correctamente.');
          setTimeout(() => void this.router.navigate(['/administration/roles']), 1500);
        },
        error: () => {
          this.saving.set(false);
          this.showToast('error', 'No se pudieron sincronizar los permisos.');
        },
      });
  }

  private modulePermissionNames(module: PermissionModule): string[] {
    return module.submodules.flatMap((s) => s.permissions.map((p) => p.value));
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toastService.show(type, message);
  }
}
