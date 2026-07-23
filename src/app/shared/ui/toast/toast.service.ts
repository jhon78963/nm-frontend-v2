import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<ToastMessage | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(type: ToastType, message: string, durationMs = 4000): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.current.set({ type, message });
    this.timer = setTimeout(() => this.dismiss(), durationMs);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.current.set(null);
  }
}
