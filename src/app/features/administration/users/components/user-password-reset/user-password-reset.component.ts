import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { UserService } from '../../data-access/user.service';
import { UserPasswordResetFormModel } from '../../models/user.model';
import {
  MEDIUM_PASSWORD_FIELD_MESSAGES,
  MEDIUM_PASSWORD_HINT,
  MEDIUM_PASSWORD_PATTERN,
} from '../../utils/medium-password.validators';

@Component({
  selector: 'app-user-password-reset',
  imports: [FormField, InputComponent, ButtonComponent],
  templateUrl: './user-password-reset.component.html',
})
export class UserPasswordResetComponent {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = input.required<number>();
  readonly username = input('');

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly passwordHint = MEDIUM_PASSWORD_HINT;

  protected readonly formModel = signal<UserPasswordResetFormModel>({
    password: '',
    passwordConfirmation: '',
  });

  protected readonly resetForm = form(this.formModel, (schema) => {
    required(schema.password, { message: MEDIUM_PASSWORD_FIELD_MESSAGES['required'] });
    minLength(schema.password, 6, {
      message: MEDIUM_PASSWORD_FIELD_MESSAGES['minLength'],
    });
    pattern(schema.password, MEDIUM_PASSWORD_PATTERN, {
      message: MEDIUM_PASSWORD_FIELD_MESSAGES['pattern'],
    });
    required(schema.passwordConfirmation, {
      message: 'Confirma la contraseña.',
    });
    validate(schema.passwordConfirmation, ({ valueOf }) => {
      if (valueOf(schema.password) !== valueOf(schema.passwordConfirmation)) {
        return {
          kind: 'mismatch',
          message: 'La confirmación no coincide.',
        };
      }
      return undefined;
    });
  });

  protected readonly passwordError = computed(() =>
    fieldErrorMessage(this.resetForm.password, MEDIUM_PASSWORD_FIELD_MESSAGES),
  );

  protected readonly passwordConfirmationError = computed(() =>
    fieldErrorMessage(this.resetForm.passwordConfirmation, {
      ...MEDIUM_PASSWORD_FIELD_MESSAGES,
      mismatch: 'La confirmación no coincide.',
    }),
  );

  protected submit(event: Event): void {
    event.preventDefault();
    this.resetForm().markAsTouched();

    if (this.resetForm().invalid()) {
      return;
    }

    const { password, passwordConfirmation } = this.formModel();
    if (password !== passwordConfirmation) {
      this.errorMessage.set('La confirmación de la contraseña no coincide.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    this.userService
      .resetPassword(this.userId(), { password, passwordConfirmation })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit(
            'Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión.',
          );
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(
            typeof err === 'string'
              ? err
              : 'No se pudo restablecer la contraseña.',
          );
        },
      });
  }

  protected close(): void {
    this.closed.emit();
  }
}
