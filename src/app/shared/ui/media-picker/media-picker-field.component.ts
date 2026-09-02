import {
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { MEDIA_IMAGE_ACCEPT } from '../../../features/ecommerce/media/constants/media.constants';
import { MediaLibraryItem } from '../../../features/ecommerce/media/models/media-library.model';
import { MediaPickerModalComponent } from './media-picker-modal.component';

@Component({
  selector: 'app-media-picker-field',
  imports: [ButtonComponent, MediaPickerModalComponent],
  templateUrl: './media-picker-field.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MediaPickerFieldComponent),
      multi: true,
    },
  ],
})
export class MediaPickerFieldComponent implements ControlValueAccessor {
  readonly label = input('Imagen');
  readonly accept = input(MEDIA_IMAGE_ACCEPT);
  readonly multiple = input(false);
  readonly disabled = input(false);
  readonly value = input('');

  readonly valueChange = output<string>();

  protected readonly currentValue = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly modalOpen = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};
  private formControlled = false;

  constructor() {
    effect(() => {
      if (!this.formControlled) {
        this.currentValue.set(this.value());
      }
    });
  }

  writeValue(value: string | null): void {
    this.formControlled = true;
    this.currentValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected openModal(): void {
    if (this.isDisabled() || this.disabled()) {
      return;
    }
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.onTouched();
  }

  protected clearValue(): void {
    if (this.isDisabled() || this.disabled()) {
      return;
    }
    this.updateValue('');
  }

  protected onSelected(selection: MediaLibraryItem | MediaLibraryItem[]): void {
    const item = Array.isArray(selection) ? selection[0] : selection;
    if (!item) {
      return;
    }
    this.updateValue(item.url);
    this.closeModal();
  }

  protected isImageUrl(url: string): boolean {
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.includes('/storage/files/');
  }

  protected updateValueFromInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.updateValue(next);
  }

  private updateValue(next: string): void {
    this.currentValue.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }
}
