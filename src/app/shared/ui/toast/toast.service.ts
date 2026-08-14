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
  private loadingToastId: string | null = null;
  private nextToastId = 0;

  show(type: ToastType, message: string, durationMs = 4000): void {
    this.clearTimer();
    this.loadingToastId = null;
    this.current.set({ type, message });
    this.timer = setTimeout(() => this.dismiss(), durationMs);
  }

  /** Shows a persistent info toast while a file is being generated. Returns an id to dismiss later. */
  loading(message: string): string {
    this.clearTimer();
    const id = `toast-${++this.nextToastId}`;
    this.loadingToastId = id;
    this.current.set({ type: 'info', message });
    return id;
  }

  dismiss(id?: string): void {
    if (id && this.loadingToastId !== id) {
      return;
    }

    this.clearTimer();
    this.loadingToastId = null;
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
