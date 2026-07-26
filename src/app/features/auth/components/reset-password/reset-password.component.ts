import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, minLength, pattern, required } from '@angular/forms/signals';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { AuthService } from '../../data-access/auth.service';
import { ResetPasswordFormModel } from '../../models/auth.model';
import { fieldErrorMessage } from '../../utils/form-field.util';
import {
  PASSWORD_COMPLEXITY_PATTERN,
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
} from '../../utils/password.validators';

type ViewState = 'form' | 'success' | 'invalid-link';

@Component({
  selector: 'app-reset-password',
  imports: [FormField, RouterLink, AlertComponent, InputComponent, ButtonComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly viewState = signal<ViewState>('form');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected token = '';
  protected email = '';

  protected readonly passwordHint = PASSWORD_HINT;

  protected readonly formModel = signal<ResetPasswordFormModel>({
    password: '',
    passwordConfirmation: '',
  });

  protected readonly resetForm = form(this.formModel, (schema) => {
    required(schema.password, { message: 'La contraseña es obligatoria.' });
    minLength(schema.password, PASSWORD_MIN_LENGTH, {
      message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
    });
    pattern(schema.password, PASSWORD_COMPLEXITY_PATTERN, {
      message: 'Debe incluir mayúsculas, minúsculas, números y símbolos.',
    });
    required(schema.passwordConfirmation, { message: 'Confirma la contraseña.' });
  });

  protected readonly passwordError = computed(() =>
    fieldErrorMessage(this.resetForm.password, {
      required: 'La contraseña es obligatoria.',
      minLength: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
      pattern: 'Debe incluir mayúsculas, minúsculas, números y símbolos.',
    }),
  );

  protected readonly confirmError = computed(() =>
    fieldErrorMessage(this.resetForm.passwordConfirmation, {
      required: 'Confirma la contraseña.',
    }),
  );

  protected readonly passwordsMatch = computed(() => {
    const m = this.formModel();
    return m.password === m.passwordConfirmation;
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    if (!this.token || !this.email) {
      this.viewState.set('invalid-link');
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.resetForm().markAsTouched();

    if (this.resetForm().invalid()) return;

    if (!this.passwordsMatch()) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const model = this.formModel();

    this.authService
      .resetPassword({
        token: this.token,
        email: this.email,
        password: model.password,
        passwordConfirmation: model.passwordConfirmation,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.viewState.set('success');
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            typeof err === 'string'
              ? err
              : 'No se pudo restablecer la contraseña. El enlace puede haber expirado.',
          );
        },
      });
  }

  protected goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
}
