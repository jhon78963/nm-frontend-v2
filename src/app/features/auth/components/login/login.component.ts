import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, minLength, required } from '@angular/forms/signals';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { AuthService } from '../../data-access/auth.service';
import { LoginFormModel } from '../../models/auth.model';
import { fieldErrorMessage } from '../../utils/form-field.util';

@Component({
  selector: 'app-login',
  imports: [
    FormField,
    RouterLink,
    AlertComponent,
    InputComponent,
    ButtonComponent,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly loginModel = signal<LoginFormModel>({
    username: '',
    password: '',
  });

  protected readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.username, { message: 'Usuario requerido' });
    required(schema.password, { message: 'Contraseña requerida' });
    minLength(schema.password, 8, { message: 'Mínimo 8 caracteres' });
  });

  protected readonly usernameError = computed(() =>
    fieldErrorMessage(this.loginForm.username, { required: 'Usuario requerido' }),
  );

  protected readonly passwordError = computed(() =>
    fieldErrorMessage(this.loginForm.password, {
      required: 'Contraseña requerida',
      minLength: 'Mínimo 8 caracteres',
    }),
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.loginForm().markAsTouched();

    if (this.loginForm().invalid()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials = this.loginModel();

    this.authService.login(credentials).subscribe({
      next: (user) => {
        this.isLoading.set(false);

        if (user.mustChangePassword) {
          void this.router.navigate(['/change-password']);
          return;
        }

        void this.router.navigate(['/administration/roles']);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          typeof error === 'string'
            ? error
            : 'Error al iniciar sesión. Verifica tus credenciales.',
        );
      },
    });
  }
}
