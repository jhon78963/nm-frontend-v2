export const MEDIA_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp';

export const MEDIA_DOCUMENT_ACCEPT =
  'application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MEDIA_ALL_ACCEPT = `${MEDIA_IMAGE_ACCEPT},${MEDIA_DOCUMENT_ACCEPT}`;

export const MEDIA_SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'smallest', label: 'Menor tamaño' },
  { value: 'largest', label: 'Mayor tamaño' },
] as const;
