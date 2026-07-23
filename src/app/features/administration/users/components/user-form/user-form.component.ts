import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  email,
  form,
  FormField,
  hidden,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { forkJoin } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import {
  PASSWORD_COMPLEXITY_PATTERN,
  PASSWORD_FIELD_MESSAGES,
  PASSWORD_HINT,
} from '../../../../auth/utils/password.validators';
import { UserLookupService } from '../../data-access/user-lookup.service';
import { UserService } from '../../data-access/user.service';
import { UserFormModel, UserPayload } from '../../models/user.model';

@Component({
  selector: 'app-user-form',
  imports: [FormField, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly lookupService = inject(UserLookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  protected readonly passwordHint = PASSWORD_HINT;

  protected readonly tenantOptions = signal<SelectOption<number>[]>([]);
  protected readonly warehouseOptions = signal<SelectOption<number>[]>([]);
  protected readonly roleOptions = signal<SelectOption<string>[]>([]);

  protected readonly formModel = signal<UserFormModel>({
    tenantId: null,
    warehouseId: null,
    roleName: '',
    name: '',
    surname: '',
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });

  protected readonly isEditing = computed(() => this.userId() !== null);

  protected readonly userForm = form(this.formModel, (schema) => {
    required(schema.tenantId, { message: 'Selecciona un cliente.' });
    required(schema.warehouseId, { message: 'Selecciona una tienda.' });
    required(schema.roleName, { message: 'Selecciona un rol.' });
    required(schema.name, { message: 'El nombre es obligatorio.' });
    required(schema.surname, { message: 'Los apellidos son obligatorios.' });
    required(schema.username, { message: 'El usuario es obligatorio.' });
    minLength(schema.username, 3, { message: 'Mínimo 3 caracteres.' });

    required(schema.email, { message: 'El email es obligatorio.' });
    email(schema.email, { message: 'Email inválido.' });

    hidden(schema.password, { when: () => this.isEditing() });
    hidden(schema.passwordConfirmation, { when: () => this.isEditing() });

    required(schema.password, { message: PASSWORD_FIELD_MESSAGES['required'] });
    minLength(schema.password, 12, {
      message: PASSWORD_FIELD_MESSAGES['minLength'],
    });
    pattern(schema.password, PASSWORD_COMPLEXITY_PATTERN, {
      message: PASSWORD_FIELD_MESSAGES['pattern'],
    });
    required(schema.passwordConfirmation, {
      message: 'Confirma la contraseña.',
    });
    validate(schema.passwordConfirmation, ({ valueOf }) => {
      if (this.isEditing()) return undefined;
      if (valueOf(schema.password) !== valueOf(schema.passwordConfirmation)) {
        return {
          kind: 'mismatch',
          message: 'La confirmación no coincide.',
        };
      }
      return undefined;
    });
  });

  protected readonly tenantError = computed(() =>
    fieldErrorMessage(this.userForm.tenantId, {
      required: 'Selecciona un cliente.',
    }),
  );

  protected readonly warehouseError = computed(() =>
    fieldErrorMessage(this.userForm.warehouseId, {
      required: 'Selecciona una tienda.',
    }),
  );

  protected readonly roleError = computed(() =>
    fieldErrorMessage(this.userForm.roleName, {
      required: 'Selecciona un rol.',
    }),
  );

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.userForm.name, { required: 'El nombre es obligatorio.' }),
  );

  protected readonly surnameError = computed(() =>
    fieldErrorMessage(this.userForm.surname, {
      required: 'Los apellidos son obligatorios.',
    }),
  );

  protected readonly usernameError = computed(() =>
    fieldErrorMessage(this.userForm.username, {
      required: 'El usuario es obligatorio.',
      minLength: 'Mínimo 3 caracteres.',
    }),
  );

  protected readonly emailError = computed(() =>
    fieldErrorMessage(this.userForm.email, {
      required: 'El email es obligatorio.',
      email: 'Email inválido.',
    }),
  );

  protected readonly passwordError = computed(() =>
    fieldErrorMessage(this.userForm.password, PASSWORD_FIELD_MESSAGES),
  );

  protected readonly passwordConfirmationError = computed(() =>
    fieldErrorMessage(this.userForm.passwordConfirmation, {
      ...PASSWORD_FIELD_MESSAGES,
      mismatch: 'La confirmación no coincide.',
    }),
  );

  constructor() {
    effect(() => {
      const tenantId = this.formModel().tenantId;
      if (tenantId) {
        this.loadWarehouses(tenantId);
      } else {
        this.warehouseOptions.set([]);
      }
    });
  }

  ngOnInit(): void {
    const id = this.userId();

    if (id !== null) {
      forkJoin({
        lookups: forkJoin({
          tenants: this.lookupService.getTenants(),
          roles: this.lookupService.getRoles(),
        }),
        user: this.userService.getOne(id),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ lookups, user }) => {
            this.tenantOptions.set(
              lookups.tenants.map((t) => ({ label: t.name, value: t.id })),
            );
            this.roleOptions.set(
              lookups.roles.map((r) => ({ label: r.name, value: r.name })),
            );

            this.formModel.set({
              tenantId: user.tenantId,
              warehouseId: user.warehouseId,
              roleName: user.roles?.[0] ?? user.role ?? '',
              name: user.name,
              surname: user.surname,
              username: user.username,
              email: user.email,
              password: '',
              passwordConfirmation: '',
            });

            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el usuario.');
            this.loadingData.set(false);
          },
        });
    } else {
      forkJoin({
        tenants: this.lookupService.getTenants(),
        roles: this.lookupService.getRoles(),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ tenants, roles }) => {
            this.tenantOptions.set(
              tenants.map((t) => ({ label: t.name, value: t.id })),
            );
            this.roleOptions.set(
              roles.map((r) => ({ label: r.name, value: r.name })),
            );
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudieron cargar los catálogos.');
            this.loadingData.set(false);
          },
        });
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.userForm().markAsTouched();

    if (this.userForm().invalid()) {
      return;
    }

    const model = this.formModel();
    if (
      model.tenantId === null ||
      model.warehouseId === null ||
      !model.roleName.trim()
    ) {
      return;
    }

    this.saving.set(true);

    const id = this.userId();
    const basePayload: UserPayload = {
      username: model.username.trim(),
      name: model.name.trim(),
      surname: model.surname.trim(),
      tenantId: model.tenantId,
      warehouseId: model.warehouseId,
      roleNames: [model.roleName],
      profilePicture: '',
    };

    const request$ =
      id !== null
        ? this.userService.update(id, basePayload)
        : this.userService.create({
            ...basePayload,
            email: model.email.trim(),
            password: model.password,
            passwordConfirmation: model.passwordConfirmation,
          });

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit(
          id !== null
            ? 'Usuario actualizado correctamente.'
            : 'Usuario creado correctamente.',
        );
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.loadError.set(
          typeof err === 'string'
            ? err
            : 'No se pudo guardar el usuario. Verifica los datos.',
        );
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  private loadWarehouses(tenantId: number): void {
    this.lookupService
      .getWarehouses(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (warehouses) => {
          this.warehouseOptions.set(
            warehouses.map((w) => ({ label: w.name, value: w.id })),
          );

          const current = this.formModel().warehouseId;
          if (
            current !== null &&
            !warehouses.some((w) => w.id === current)
          ) {
            this.formModel.update((m) => ({ ...m, warehouseId: null }));
          }
        },
        error: () => {
          this.warehouseOptions.set([]);
        },
      });
  }
}
