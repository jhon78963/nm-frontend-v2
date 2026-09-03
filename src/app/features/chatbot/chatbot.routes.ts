import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'WhatsApp Bot',
    data: { breadcrumb: 'WhatsApp Bot' },
    loadComponent: () =>
      import('./components/chatbot-shell/chatbot-shell.component').then(
        (m) => m.ChatbotShellComponent,
      ),
  },
];

export default routes;
