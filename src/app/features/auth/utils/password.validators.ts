/** Alineado con Laravel `Password::defaults()` (SEC-011). */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_COMPLEXITY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export const PASSWORD_MIN_LENGTH_MESSAGE =
  'La contraseña debe tener al menos 12 caracteres.';

export const PASSWORD_COMPLEXITY_MESSAGE =
  'La contraseña debe incluir mayúsculas, minúsculas, números y símbolos.';

export const PASSWORD_HINT =
  'Mínimo 12 caracteres, con mayúsculas, minúsculas, números y símbolos.';

export const PASSWORD_FIELD_MESSAGES: Record<string, string> = {
  required: 'La contraseña es obligatoria.',
  minLength: PASSWORD_MIN_LENGTH_MESSAGE,
  pattern: PASSWORD_COMPLEXITY_MESSAGE,
};
