import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { AuthService } from '../../data-access/auth.service';
import { ForgotPasswordFormModel } from '../../models/auth.model';
import { fieldErrorMessage } from '../../utils/form-field.util';

type ViewState = 'form' | 'success';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink, AlertComponent, InputComponent, ButtonComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  protected readonly viewState = signal<ViewState>('form');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submittedEmail = signal('');

  protected readonly formModel = signal<ForgotPasswordFormModel>({ email: '' });

  protected readonly forgotForm = form(this.formModel, (schema) => {
    required(schema.email, { message: 'El correo electrónico es obligatorio.' });
  });

  protected readonly emailError = computed(() =>
    fieldErrorMessage(this.forgotForm.email, {
      required: 'El correo electrónico es obligatorio.',
    }),
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.forgotForm().markAsTouched();

    if (this.forgotForm().invalid()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword({ email: this.formModel().email }).subscribe({
      next: () => {
        this.submittedEmail.set(this.formModel().email);
        this.isLoading.set(false);
        this.viewState.set('success');
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          typeof err === 'string' ? err : 'Ocurrió un error. Inténtalo de nuevo.',
        );
      },
    });
  }
}
