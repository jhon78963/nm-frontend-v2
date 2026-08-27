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
  required,
} from '@angular/forms/signals';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../shared/ui/select/select.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { SizeLookupService } from '../../data-access/size-lookup.service';
import { SizeService } from '../../data-access/size.service';
import { SizeFormModel } from '../../models/size.model';

const EMPTY_FORM: SizeFormModel = {
  description: '',
  sizeTypeId: null,
};

@Component({
  selector: 'app-size-form',
  imports: [FormField, InputComponent, SelectComponent, ButtonComponent, TableActionButtonComponent],
  templateUrl: './size-form.component.html',
})
export class SizeFormComponent implements OnInit {
  private readonly sizeService = inject(SizeService);
  private readonly lookupService = inject(SizeLookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sizeId = input<string | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly sizeTypeOptions = signal<SelectOption<string>[]>([]);

  protected readonly formModel = signal<SizeFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.sizeId() !== null);

  protected readonly sizeForm = form(this.formModel, (schema) => {
    required(schema.sizeTypeId, { message: 'Selecciona un tipo de talla.' });
    required(schema.description, { message: 'La talla es obligatoria.' });
    maxLength(schema.description, 25, { message: 'Máximo 25 caracteres.' });
  });

  protected readonly sizeTypeError = computed(() =>
    fieldErrorMessage(this.sizeForm.sizeTypeId, {
      required: 'Selecciona un tipo de talla.',
    }),
  );

  protected readonly descriptionError = computed(() =>
    fieldErrorMessage(this.sizeForm.description, {
      required: 'La talla es obligatoria.',
      maxLength: 'Máximo 25 caracteres.',
    }),
  );

  ngOnInit(): void {
    this.lookupService
      .getSizeTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.sizeTypeOptions.set(
            types.map((type) => ({ label: type.description, value: type.id })),
          );
          this.loadSizeIfEditing(types);
        },
        error: () => {
          this.loadError.set('No se pudo cargar los tipos de talla.');
          this.loadingData.set(false);
        },
      });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.sizeForm().markAsTouched();

    if (this.sizeForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const sizeTypeId = model.sizeTypeId;
    if (sizeTypeId === null) {
      return;
    }

    const payload = {
      description: model.description.trim(),
      sizeTypeId,
    };

    const id = this.sizeId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.sizeService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Talla actualizada correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo guardar la talla. Verifica los datos.',
            );
          },
        });
    } else {
      this.sizeService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Talla creada correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo crear la talla. Verifica los datos.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  private loadSizeIfEditing(
    types: { id: string; description: string }[],
  ): void {
    const id = this.sizeId();

    if (id === null) {
      const defaultType = types[0];
      if (defaultType) {
        this.formModel.update((current) => ({
          ...current,
          sizeTypeId: defaultType.id,
        }));
      }
      this.loadingData.set(false);
      return;
    }

    this.sizeService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (size) => {
          const matchedType = types.find(
            (type) => type.description === size.sizeTypeLabel,
          );

          this.formModel.set({
            description: size.description,
            sizeTypeId: matchedType?.id ?? types[0]?.id ?? null,
          });
          this.loadingData.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la talla.');
          this.loadingData.set(false);
        },
      });
  }
}
