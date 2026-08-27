export const environment = {
  production: false,
  baseWebUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3000/api/v1',   // Gateway NestJS — prefijo /api/v1 (no solo /v1)
  baseUploadUrl: 'http://127.0.0.1:3050',
  COMPANY_ID: 'REPLACE_WITH_TENANT_UUID', // TODO: reemplazar con el UUID real del tenant en la nueva DB
};
