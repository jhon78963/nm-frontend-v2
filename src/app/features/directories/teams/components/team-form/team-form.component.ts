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
import {
  form,
  FormField,
  maxLength,
  pattern,
  required,
} from '@angular/forms/signals';
import { AuthService } from '../../../../auth/data-access/auth.service';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { AlertComponent } from '../../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { MoneyInputComponent } from '../../../../../shared/ui/money-input/money-input.component';
import { SelectComponent, SelectOption } from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { TeamLookupService } from '../../data-access/team-lookup.service';
import { TeamService } from '../../data-access/team.service';
import { TeamFormModel } from '../../models/team.model';

const EMPTY_FORM: TeamFormModel = {
  dni: '',
  name: '',
  surname: '',
  salary: null,
  warehouseId: null,
};

@Component({
  selector: 'app-team-form',
  imports: [
    FormField,
    InputComponent,
    MoneyInputComponent,
    SelectComponent,
    ButtonComponent,
    AlertComponent,
    TableActionButtonComponent,
  ],
  templateUrl: './team-form.component.html',
})
export class TeamFormComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly lookupService = inject(TeamLookupService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly teamId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly warehouseOptions = signal<SelectOption<number>[]>([]);

  protected readonly formModel = signal<TeamFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.teamId() !== null);

  protected readonly teamForm = form(this.formModel, (schema) => {
    required(schema.dni, { message: 'El DNI es obligatorio.' });
    pattern(schema.dni, /^\d{8}$/, { message: 'El DNI debe tener 8 dígitos.' });
    required(schema.name, { message: 'Los nombres son obligatorios.' });
    maxLength(schema.name, 80, { message: 'Máximo 80 caracteres.' });
    required(schema.surname, { message: 'Los apellidos son obligatorios.' });
    maxLength(schema.surname, 80, { message: 'Máximo 80 caracteres.' });
    required(schema.warehouseId, { message: 'Selecciona una tienda.' });
  });

  protected readonly dniError = computed(() =>
    fieldErrorMessage(this.teamForm.dni, {
      required: 'El DNI es obligatorio.',
      pattern: 'El DNI debe tener 8 dígitos.',
    }),
  );

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.teamForm.name, {
      required: 'Los nombres son obligatorios.',
      maxLength: 'Máximo 80 caracteres.',
    }),
  );

  protected readonly surnameError = computed(() =>
    fieldErrorMessage(this.teamForm.surname, {
      required: 'Los apellidos son obligatorios.',
      maxLength: 'Máximo 80 caracteres.',
    }),
  );

  protected readonly warehouseError = computed(() =>
    fieldErrorMessage(this.teamForm.warehouseId, {
      required: 'Selecciona una tienda.',
    }),
  );

  ngOnInit(): void {
    const tenantId = this.authService.currentUser()?.tenantId ?? null;

    this.lookupService
      .getWarehouses(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (warehouses) => {
          this.warehouseOptions.set(
            warehouses.map((w) => ({ label: w.name, value: w.id })),
          );
        },
        error: () => {
          this.loadError.set('No se pudo cargar la lista de tiendas.');
        },
      });

    const id = this.teamId();
    if (id !== null) {
      this.teamService
        .getOne(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (team) => {
            this.formModel.set({
              dni: String(team.dni).replace(/\D/g, '').slice(0, 8),
              name: team.name,
              surname: team.surname,
              salary: team.salary,
              warehouseId: team.warehouseId,
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el colaborador.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.teamForm().markAsTouched();

    if (this.teamForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const warehouseId = model.warehouseId;
    if (warehouseId === null) return;

    const payload = {
      dni: model.dni.replace(/\D/g, '').slice(0, 8),
      name: model.name.trim(),
      surname: model.surname.trim(),
      salary: model.salary,
      warehouseId,
    };

    const id = this.teamId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.teamService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Colaborador actualizado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo actualizar el colaborador.',
            );
          },
        });
    } else {
      this.teamService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.saving.set(false);
            const email = res.data.userEmail;
            const info = email
              ? `${res.message} Usuario: ${email}`
              : res.message;
            this.saved.emit(info);
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string' ? err : 'No se pudo crear el colaborador.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
