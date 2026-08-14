import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  email,
  form,
  FormField,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { PhoneInputComponent } from '../../shared/ui/phone-input/phone-input.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from '../auth/data-access/auth.service';
import { AvatarUploadComponent } from './components/avatar-upload/avatar-upload.component';
import { ProfileService } from './data-access/profile.service';
import {
  PasswordFormModel,
  ProfileData,
  ProfileFormModel,
} from './models/profile.model';
import { fieldErrorMessage } from './utils/form-field.util';

const EMPTY_PROFILE_FORM: ProfileFormModel = {
  name: '',
  email: '',
  phone: '',
};

const EMPTY_PASSWORD_FORM: PasswordFormModel = {
  currentPassword: '',
  newPassword: '',
  newPasswordConfirmation: '',
};

@Component({
  selector: 'app-profile',
  imports: [
    FormField,
    AlertComponent,
    ButtonComponent,
    InputComponent,
    PhoneInputComponent,
    AvatarUploadComponent,
  ],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly profileError = signal('');
  protected readonly passwordError = signal('');

  protected readonly profile = signal<ProfileData | null>(null);

  protected readonly profileModel = signal<ProfileFormModel>({ ...EMPTY_PROFILE_FORM });
  protected readonly passwordModel = signal<PasswordFormModel>({ ...EMPTY_PASSWORD_FORM });

  protected readonly profileForm = form(this.profileModel, (schema) => {
    required(schema.name, { message: 'El nombre es obligatorio.' });
    minLength(schema.name, 2, { message: 'Mínimo 2 caracteres.' });
    required(schema.email, { message: 'El email es obligatorio.' });
    email(schema.email, { message: 'Email inválido.' });
    validate(schema.phone, ({ value }) => {
      const phone = value();
      if (!phone) {
        return undefined;
      }

      if (!/^\d{9}$/.test(phone)) {
        return {
          kind: 'pattern',
          message: 'El teléfono debe tener 9 dígitos.',
        };
      }

      return undefined;
    });
  });

  protected readonly passwordForm = form(this.passwordModel, (schema) => {
    required(schema.currentPassword, {
      message: 'La contraseña actual es obligatoria.',
    });
    required(schema.newPassword, { message: 'La nueva contraseña es obligatoria.' });
    minLength(schema.newPassword, 8, { message: 'Mínimo 8 caracteres.' });
    required(schema.newPasswordConfirmation, {
      message: 'Confirma la nueva contraseña.',
    });
    minLength(schema.newPasswordConfirmation, 8, {
      message: 'Mínimo 8 caracteres.',
    });
    validate(schema.newPasswordConfirmation, ({ valueOf }) => {
      if (valueOf(schema.newPassword) !== valueOf(schema.newPasswordConfirmation)) {
        return {
          kind: 'mismatch',
          message: 'Las contraseñas no coinciden.',
        };
      }

      return undefined;
    });
  });

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.profileForm.name, {
      required: 'El nombre es obligatorio.',
      minLength: 'Mínimo 2 caracteres.',
    }),
  );

  protected readonly emailError = computed(() =>
    fieldErrorMessage(this.profileForm.email, {
      required: 'El email es obligatorio.',
      email: 'Email inválido.',
    }),
  );

  protected readonly phoneError = computed(() =>
    fieldErrorMessage(this.profileForm.phone, {
      pattern: 'El teléfono debe tener 9 dígitos.',
    }),
  );

  protected readonly currentPasswordError = computed(() =>
    fieldErrorMessage(this.passwordForm.currentPassword, {
      required: 'La contraseña actual es obligatoria.',
    }),
  );

  protected readonly newPasswordError = computed(() =>
    fieldErrorMessage(this.passwordForm.newPassword, {
      required: 'La nueva contraseña es obligatoria.',
      minLength: 'Mínimo 8 caracteres.',
    }),
  );

  protected readonly confirmPasswordError = computed(() =>
    fieldErrorMessage(this.passwordForm.newPasswordConfirmation, {
      required: 'Confirma la nueva contraseña.',
      minLength: 'Mínimo 8 caracteres.',
      mismatch: 'Las contraseñas no coinciden.',
    }),
  );

  protected readonly formattedCreatedAt = computed(() =>
    this.formatDate(this.profile()?.createdAt ?? ''),
  );

  ngOnInit(): void {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.profileService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.applyProfile(profile);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(
            typeof err === 'string'
              ? err
              : 'No se pudo cargar el perfil. Intenta nuevamente.',
          );
        },
      });
  }

  protected onPhoneChange(phone: string): void {
    this.profileModel.update((model) => ({ ...model, phone }));
  }

  protected onAvatarSelected(file: File): void {
    this.uploadingAvatar.set(true);

    this.profileService
      .uploadAvatar(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ avatarUrl }) => {
          this.uploadingAvatar.set(false);
          this.profile.update((current) =>
            current ? { ...current, avatarUrl } : current,
          );
          this.authService.patchCurrentUser({ profilePicture: avatarUrl });
          this.toastService.show('success', 'Foto de perfil actualizada.');
        },
        error: (err: unknown) => {
          this.uploadingAvatar.set(false);
          this.toastService.show(
            'error',
            typeof err === 'string'
              ? err
              : 'No se pudo subir la foto de perfil.',
          );
        },
      });
  }

  protected saveProfile(event: Event): void {
    event.preventDefault();
    this.profileForm().markAsTouched();

    if (this.profileForm().invalid()) {
      return;
    }

    const model = this.profileModel();
    this.savingProfile.set(true);
    this.profileError.set('');

    this.profileService
      .updateProfile({
        name: model.name.trim(),
        email: model.email.trim(),
        phone: model.phone.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.savingProfile.set(false);
          this.applyProfile(profile);
          this.toastService.show('success', 'Cambios guardados correctamente.');
        },
        error: (err: unknown) => {
          this.savingProfile.set(false);
          this.profileError.set(
            typeof err === 'string'
              ? err
              : 'No se pudieron guardar los cambios.',
          );
        },
      });
  }

  protected savePassword(event: Event): void {
    event.preventDefault();
    this.passwordForm().markAsTouched();

    if (this.passwordForm().invalid()) {
      return;
    }

    const model = this.passwordModel();
    this.savingPassword.set(true);
    this.passwordError.set('');

    this.profileService
      .updatePassword({
        currentPassword: model.currentPassword,
        newPassword: model.newPassword,
        newPasswordConfirmation: model.newPasswordConfirmation,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordModel.set({ ...EMPTY_PASSWORD_FORM });
          this.toastService.show('success', 'Contraseña actualizada.');
        },
        error: (err: unknown) => {
          this.savingPassword.set(false);
          this.passwordError.set(
            typeof err === 'string'
              ? err
              : 'No se pudo actualizar la contraseña.',
          );
        },
      });
  }

  private applyProfile(profile: ProfileData): void {
    this.profile.set(profile);
    this.profileModel.set({
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? '',
    });
    this.syncAuthUser(profile);
  }

  private syncAuthUser(profile: ProfileData): void {
    const parts = profile.name.trim().split(/\s+/).filter(Boolean);
    const name = parts[0] ?? profile.name;
    const surname = parts.slice(1).join(' ');

    this.authService.patchCurrentUser({
      name,
      surname,
      email: profile.email,
      profilePicture: profile.avatarUrl,
    });
  }

  private formatDate(value: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
