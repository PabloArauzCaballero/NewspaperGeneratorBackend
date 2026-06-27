# Seguridad de producción implementada

Esta versión endurece el backend para que el MVP no quede como una maqueta vulnerable.

## Medidas activas

- `X-Request-Id` por request, reutilizando uno entrante solo si tiene formato seguro.
- Respuestas de error normalizadas con `statusCode`, `message`, `issues`, `path`, `method`, `requestId` y `timestamp`.
- Headers de seguridad estilo Helmet sin dependencia externa:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy` restrictivo
  - `Content-Security-Policy` estricta para API y compatible con Swagger en `/docs`.
- Rate limiting por IP + User-Agent:
  - Perfil `auth` para login/register/refresh.
  - Perfil `write` para mutaciones.
  - Perfil `read` para lecturas.
  - Usa Redis si está configurado y fallback en memoria local si Redis no está disponible.
- Refresh tokens opacos con hash HMAC-SHA256 en base de datos.
- Rotación de refresh token en `/auth/refresh`.
- Revocación de refresh token en `/auth/logout`.
- Bloqueo temporal por intentos fallidos repetidos.
- Auditoría de intentos de login en `auth_login_attempts`.
- Reset password con tokens opacos y revocación de sesiones activas.
- Endpoints admin para revisar intentos de login, refresh tokens y corridas de workers.

## Endpoints nuevos

```txt
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/request-password-reset
POST /api/v1/auth/reset-password
GET  /api/v1/admin/security/login-attempts
GET  /api/v1/admin/security/users/:id/refresh-tokens
POST /api/v1/admin/security/users/:id/revoke-refresh-tokens
GET  /api/v1/admin/security/worker-runs
```

## Variables

```env
JWT_REFRESH_EXPIRES_IN_DAYS=30
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_AUTH_MAX=8
RATE_LIMIT_WRITE_MAX=80
RATE_LIMIT_READ_MAX=300
```

## Prueba recomendada

Con el servidor levantado:

```bash
npm run test:security
```

Ese smoke valida headers, request id, formato de errores y rate limiting de autenticación.
