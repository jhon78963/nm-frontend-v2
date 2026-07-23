import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  form,
  FormField,
  hidden,
  minLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AuthService } from '../../data-access/auth.service';
import { ChangePasswordFormModel } from '../../models/auth.model';
import { fieldErrorMessage } from '../../utils/form-field.util';
import {
  PASSWORD_COMPLEXITY_PATTERN,
  PASSWORD_FIELD_MESSAGES,
  PASSWORD_HINT,
} from '../../utils/password.validators';

@Component({
  selector: 'app-change-password',
  imports: [FormField, AlertComponent, InputComponent, ButtonComponent],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly passwordHint = PASSWORD_HINT;

  protected readonly mustChangePassword = computed(
    () => this.authService.currentUser()?.mustChangePassword === true,
  );

  protected readonly formModel = signal<ChangePasswordFormModel>({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  });

  protected readonly passwordForm = form(this.formModel, (schema) => {
    hidden(schema.currentPassword, {
      when: () => this.mustChangePassword(),
    });

    required(schema.currentPassword, {
      message: 'La contraseña actual es obligatoria.',
    });
    required(schema.password, { message: PASSWORD_FIELD_MESSAGES['required'] });
    minLength(schema.password, 12, {
      message: PASSWORD_FIELD_MESSAGES['minLength'],
    });
    pattern(schema.password, PASSWORD_COMPLEXITY_PATTERN, {
      message: PASSWORD_FIELD_MESSAGES['pattern'],
    });
    required(schema.passwordConfirmation, {
      message: 'Confirma tu nueva contraseña.',
    });
    minLength(schema.passwordConfirmation, 12, {
      message: PASSWORD_FIELD_MESSAGES['minLength'],
    });
    pattern(schema.passwordConfirmation, PASSWORD_COMPLEXITY_PATTERN, {
      message: PASSWORD_FIELD_MESSAGES['pattern'],
    });

    validate(schema.passwordConfirmation, ({ valueOf }) => {
      if (valueOf(schema.password) !== valueOf(schema.passwordConfirmation)) {
        return {
          kind: 'mismatch',
          message: 'La confirmación no coincide con la nueva contraseña.',
        };
      }
      return undefined;
    });
  });

  protected readonly currentPasswordError = computed(() =>
    fieldErrorMessage(this.passwordForm.currentPassword, {
      required: 'La contraseña actual es obligatoria.',
    }),
  );

  protected readonly passwordError = computed(() =>
    fieldErrorMessage(this.passwordForm.password, PASSWORD_FIELD_MESSAGES),
  );

  protected readonly passwordConfirmationError = computed(() =>
    fieldErrorMessage(this.passwordForm.passwordConfirmation, {
      ...PASSWORD_FIELD_MESSAGES,
      mismatch: 'La confirmación no coincide con la nueva contraseña.',
    }),
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.passwordForm().markAsTouched();

    if (this.passwordForm().invalid()) {
      return;
    }

    const { currentPassword, password, passwordConfirmation } = this.formModel();

    if (password !== passwordConfirmation) {
      this.errorMessage.set('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = this.mustChangePassword()
      ? { password, passwordConfirmation }
      : { currentPassword, password, passwordConfirmation };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toastService.show(
          'success',
          'Contraseña actualizada. Ya puedes usar el sistema.',
        );
        void this.router.navigate(['/administration/roles']);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          typeof error === 'string'
            ? error
            : 'No se pudo cambiar la contraseña. Intenta nuevamente.',
        );
      },
    });
  }

  protected signOut(): void {
    this.authService.signOut().subscribe({
      next: () => void this.router.navigate(['/auth/login']),
      error: () => void this.router.navigate(['/auth/login']),
    });
  }
}
