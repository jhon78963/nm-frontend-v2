import {
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-avatar-upload',
  template: `
    <div class="avatar-upload">
      <div class="avatar-preview">
        @if (displayUrl(); as url) {
          <img class="avatar-image" [src]="url" [alt]="'Foto de perfil de ' + (displayName() || 'usuario')" />
        } @else {
          <span class="avatar-initials" aria-hidden="true">{{ initials() }}</span>
        }
      </div>

      <button
        type="button"
        class="avatar-camera-btn"
        aria-label="Cambiar foto de perfil"
        (click)="openFilePicker()"
      >
        <svg
          class="avatar-camera-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
          />
          <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      </button>

      <input
        #fileInput
        class="sr-only"
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabindex="-1"
        (change)="onFileChange($event)"
      />
    </div>
  `,
  styleUrl: './avatar-upload.component.scss',
})
export class AvatarUploadComponent implements OnDestroy {
  readonly avatarUrl = input<string | null>(null);
  readonly displayName = input('');

  readonly fileSelected = output<File>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  private objectUrl: string | null = null;
  private readonly localPreview = signal<string | null>(null);

  protected readonly displayUrl = computed(
    () => this.localPreview() ?? this.avatarUrl(),
  );

  protected readonly initials = computed(() => {
    const parts = this.displayName()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return 'U';
    }

    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
    return `${first}${last}`.toUpperCase() || 'U';
  });

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    this.revokeObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.localPreview.set(this.objectUrl);
    this.fileSelected.emit(file);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
