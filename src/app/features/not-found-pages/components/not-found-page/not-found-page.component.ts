import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-not-found-page',
  imports: [ButtonComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);

  protected goHome(): void {
    void this.router.navigate(['/dashboard']);
  }
}
