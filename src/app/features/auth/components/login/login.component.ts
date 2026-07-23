import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { AuthService } from '../../data-access/auth.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials: LoginRequest = {
      username: this.loginForm.value.username!,
      password: this.loginForm.value.password!,
    };

    this.authService.login(credentials).subscribe({
      next: (user) => {
        this.isLoading.set(false);

        if (user.mustChangePassword) {
          void this.router.navigate(['/change-password']);
          return;
        }

        void this.router.navigate(['/inventories/products']);
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

  protected getErrorMessage(controlName: 'username' | 'password'): string {
    const control = this.loginForm.controls[controlName];

    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return controlName === 'username' ? 'Usuario requerido' : 'Contraseña requerida';
    }

    return '';
  }
}
