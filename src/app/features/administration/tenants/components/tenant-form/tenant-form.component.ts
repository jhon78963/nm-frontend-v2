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
  email,
  form,
  FormField,
  maxLength,
  required,
} from '@angular/forms/signals';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { InputComponent } from '../../../../../shared/ui/input/input.component';
import { fieldErrorMessage } from '../../../../auth/utils/form-field.util';
import { TenantService } from '../../data-access/tenant.service';
import { TenantFormModel, TenantSettingPayload } from '../../models/tenant.model';

const EMPTY_FORM: TenantFormModel = {
  name: '',
  ruc: '',
  legalName: '',
  tradeName: '',
  address: '',
  district: '',
  province: '',
  department: '',
  phone: '',
  email: '',
  website: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  logoUrl: '',
  ticketFooterNote: '',
};

@Component({
  selector: 'app-tenant-form',
  imports: [FormField, InputComponent, ButtonComponent],
  templateUrl: './tenant-form.component.html',
})
export class TenantFormComponent implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenantId = input<number | null>(null);

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly loadingData = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal('');

  protected readonly formModel = signal<TenantFormModel>({ ...EMPTY_FORM });

  protected readonly isEditing = computed(() => this.tenantId() !== null);

  protected readonly tenantForm = form(this.formModel, (schema) => {
    required(schema.name, { message: 'El nombre del cliente es obligatorio.' });
    maxLength(schema.name, 191, { message: 'Máximo 191 caracteres.' });

    maxLength(schema.ruc, 11, { message: 'El RUC debe tener máximo 11 dígitos.' });
    maxLength(schema.legalName, 191, { message: 'Máximo 191 caracteres.' });
    maxLength(schema.tradeName, 191, { message: 'Máximo 191 caracteres.' });
    maxLength(schema.address, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.district, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(schema.province, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(schema.department, 100, { message: 'Máximo 100 caracteres.' });
    maxLength(schema.phone, 30, { message: 'Máximo 30 caracteres.' });
    email(schema.email, { message: 'Correo inválido.' });
    maxLength(schema.email, 191, { message: 'Máximo 191 caracteres.' });
    maxLength(schema.website, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.facebook, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.instagram, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.tiktok, 255, { message: 'Máximo 255 caracteres.' });
    maxLength(schema.logoUrl, 512, { message: 'Máximo 512 caracteres.' });
    maxLength(schema.ticketFooterNote, 255, { message: 'Máximo 255 caracteres.' });
  });

  protected readonly nameError = computed(() =>
    fieldErrorMessage(this.tenantForm.name, {
      required: 'El nombre del cliente es obligatorio.',
      maxLength: 'Máximo 191 caracteres.',
    }),
  );

  protected readonly rucError = computed(() =>
    fieldErrorMessage(this.tenantForm.ruc, {
      maxLength: 'El RUC debe tener máximo 11 dígitos.',
    }),
  );

  protected readonly emailError = computed(() =>
    fieldErrorMessage(this.tenantForm.email, {
      email: 'Correo inválido.',
      maxLength: 'Máximo 191 caracteres.',
    }),
  );

  ngOnInit(): void {
    const id = this.tenantId();

    if (id !== null) {
      forkJoin({
        tenant: this.tenantService.getOne(id),
        setting: this.tenantService.getSettings(id).pipe(catchError(() => of(null))),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ tenant, setting }) => {
            this.formModel.set({
              name: tenant.name,
              ruc: setting?.ruc ?? '',
              legalName: setting?.legalName ?? '',
              tradeName: setting?.tradeName ?? '',
              address: setting?.address ?? '',
              district: setting?.district ?? '',
              province: setting?.province ?? '',
              department: setting?.department ?? '',
              phone: setting?.phone ?? '',
              email: setting?.email ?? '',
              website: setting?.website ?? '',
              facebook: setting?.socialLinks?.facebook ?? '',
              instagram: setting?.socialLinks?.instagram ?? '',
              tiktok: setting?.socialLinks?.tiktok ?? '',
              logoUrl: setting?.logoUrl ?? '',
              ticketFooterNote: setting?.ticketFooterNote ?? '',
            });
            this.loadingData.set(false);
          },
          error: () => {
            this.loadError.set('No se pudo cargar el cliente.');
            this.loadingData.set(false);
          },
        });
    } else {
      this.loadingData.set(false);
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.tenantForm().markAsTouched();

    if (this.tenantForm().invalid()) {
      return;
    }

    const model = this.formModel();
    const settingPayload = this.buildSettingPayload(model);
    const id = this.tenantId();

    this.saving.set(true);
    this.loadError.set('');

    if (id !== null) {
      forkJoin({
        tenant: this.tenantService.update(id, { name: model.name.trim() }),
        setting: this.tenantService.saveSettings(id, settingPayload),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit('Cliente actualizado correctamente.');
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo guardar el cliente. Verifica los datos.',
            );
          },
        });
    } else {
      this.tenantService
        .create({ name: model.name.trim() })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (tenant) => {
            this.tenantService
              .saveSettings(tenant.id, settingPayload)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => {
                  this.saving.set(false);
                  this.saved.emit('Cliente creado correctamente.');
                },
                error: () => {
                  this.saving.set(false);
                  this.saved.emit(
                    'Cliente creado, pero no se guardaron todos los ajustes fiscales.',
                  );
                },
              });
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.loadError.set(
              typeof err === 'string'
                ? err
                : 'No se pudo crear el cliente. Verifica los datos.',
            );
          },
        });
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  private buildSettingPayload(model: TenantFormModel): TenantSettingPayload {
    const trimOrNull = (value: string) => value.trim() || null;

    return {
      ruc: trimOrNull(model.ruc),
      legalName: trimOrNull(model.legalName),
      tradeName: trimOrNull(model.tradeName),
      address: trimOrNull(model.address),
      district: trimOrNull(model.district),
      province: trimOrNull(model.province),
      department: trimOrNull(model.department),
      phone: trimOrNull(model.phone),
      email: trimOrNull(model.email),
      website: trimOrNull(model.website),
      socialLinks: {
        facebook: trimOrNull(model.facebook),
        instagram: trimOrNull(model.instagram),
        tiktok: trimOrNull(model.tiktok),
      },
      logoUrl: trimOrNull(model.logoUrl),
      ticketFooterNote: trimOrNull(model.ticketFooterNote),
    };
  }
}
