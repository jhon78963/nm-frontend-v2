import { Component } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-chatbot-shell',
  templateUrl: './chatbot-shell.component.html',
  styleUrl: './chatbot-shell.component.scss',
})
export class ChatbotShellComponent {
  protected readonly adminUrl = environment.chatbotAdminUrl.replace(/\/$/, '');
}
