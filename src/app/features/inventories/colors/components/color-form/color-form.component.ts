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
import { ColorPickerInputComponent } from '../../../../../shared/ui/color-picker-input/color-picker-input.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { TableActionButtonComponent } from '../../../../../shared/ui/table-action-button/table-action-button.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { normalizeColorHash } from '../../data-access/color.adapter';
import { ColorService } from '../../data-access/color.service';
import { ColorFormModel } from '../../models/color.model';

const EMPTY_FORM: ColorFormModel = {
  description: '',
  hash: '#000000',
};

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

@Component({
  selector: 'app-color-form',
  imports: [FormField, InputComponent, ButtonComponent, ColorPickerInputComponent, TableActionButtonComponent],
  templateUrl: './color-form.component.html',
})
export class ColorFormComponent implements OnInit {
  private readonly colorService = inject(ColorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly colorId = input<string | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');
  protected readonly hashInputError = signal('');

  protected readonly formModel = signal<ColorFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.colorId() !== null);

  protected readonly previewHash = computed(() =>
    normalizeColorHash(this.formModel().hash),
  );

  protected readonly colorForm = form(this.formModel, (schema) => {
    required(schema.description, { message: 'El nombre del color es obligatorio.' });
    maxLength(schema.description, 25, { message: 'Máximo 25 caracteres.' });
    maxLength(schema.hash, 25, { message: 'Máximo 25 caracteres.' });
  });

  protected readonly descriptionError = computed(() =>
    fieldErrorMessage(this.colorForm.description, {
      required: 'El nombre del color es obligatorio.',
      maxLength: 'Máximo 25 caracteres.',
    }),
  );

  ngOnInit(): void {
    const id = this.colorId();

    if (id === null) {
      this.loadingData.set(false);
      return;
    }

    this.colorService
      .getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (color) => {
          this.formModel.set({
            description: color.description,
            hash: color.hash,
          });
          this.loadingData.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar el color.');
          this.loadingData.set(false);
        },
      });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.colorForm().markAsTouched();
    this.hashInputError.set('');

    if (this.colorForm().invalid()) {
      return;
    }

    const normalizedHash = normalizeColorHash(this.formModel().hash);
    if (!HEX_PATTERN.test(normalizedHash)) {
      this.hashInputError.set('Usa un código hexadecimal válido (ej. #FF5733).');
      return;
    }

    const payload = {
      description: this.formModel().description.trim(),
      hash: normalizedHash,
    };

    const id = this.colorId();
    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      this.colorService
        .update(id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Color actualizado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo guardar el color. Verifica los datos.',
            );
          },
        });
    } else {
      this.colorService
        .create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Color creado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo crear el color. Verifica los datos.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onHashChange(value: string): void {
    this.updateHash(value);
    this.hashInputError.set('');
  }

  private updateHash(value: string): void {
    this.formModel.update((current) => ({
      ...current,
      hash: value,
    }));
  }
}
