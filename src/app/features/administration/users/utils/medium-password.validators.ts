/** Política media para restablecimiento admin (alineada con backend PasswordPolicy::mediumRules). */
export const MEDIUM_PASSWORD_MIN_LENGTH = 6;

export const MEDIUM_PASSWORD_PATTERN =
  /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*\d))|((?=.*[A-Z])(?=.*\d))).+$/;

export const MEDIUM_PASSWORD_HINT =
  'Mínimo 6 caracteres. Debe incluir mayúsculas y minúsculas, o letras y números.';

export const MEDIUM_PASSWORD_FIELD_MESSAGES: Record<string, string> = {
  required: 'La contraseña es obligatoria.',
  minLength: 'La contraseña debe tener al menos 6 caracteres.',
  pattern:
    'La contraseña debe incluir mayúsculas y minúsculas, o letras y números.',
};
