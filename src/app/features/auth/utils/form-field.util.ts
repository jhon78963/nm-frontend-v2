import { FieldTree } from '@angular/forms/signals';

export function fieldErrorMessage(
  field: FieldTree<unknown>,
  messages: Record<string, string> = {},
): string {
  const state = field();
  if (!state.touched()) {
    return '';
  }

  const errors = state.errors();
  if (errors.length === 0) {
    return '';
  }

  const error = errors[0];
  return error.message ?? messages[error.kind] ?? '';
}
