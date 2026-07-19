import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from './shared/ui/button/button.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('nm-frontend-v2');
  protected readonly isSavingSignal = signal(false);
  protected readonly isDeletingSignal = signal(false);
  protected readonly isCancellingSignal = signal(false);

  closeModal(): void {
    this.isCancellingSignal.set(true);
    console.log('closeModal');
  }
}
