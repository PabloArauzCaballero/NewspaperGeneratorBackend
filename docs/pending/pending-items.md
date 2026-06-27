# Pendientes del periódico digital premium

Esta entrega ya resuelve lo que antes estaba pendiente en backend base: Redis real, smokes fuertes, pruebas unitarias/contrato, security smoke, worker outbox CLI, refresh tokens, errores normalizados, Postman ampliado, CI y backup Neon.

## Pendientes reales de negocio / producción externa

PENDIENTE_PERIODICO: definir proveedor de pagos real, validación de firmas de webhook, flujo de renovación, reembolsos, facturación e impuestos. El flujo demo actual es idempotente y sirve para QA, pero no sustituye integración bancaria real.

PENDIENTE_PERIODICO: integrar storage real S3/CloudFront para subida directa de imágenes, videos y audios con antivirus/validación de contenido. El módulo `media` actual registra assets, pero no sube binarios a storage cloud.

PENDIENTE_PERIODICO: definir política editorial final para si periodistas pueden publicar directamente o siempre requieren aprobación editorial. El flujo actual soporta revisión/aprobación/editor.

PENDIENTE_PERIODICO: definir política legal de privacidad, retención de analítica, consentimiento de cookies y tratamiento de datos personales.

PENDIENTE_PERIODICO: definir matriz completa de permisos granulares por rol para activar autorización basada en `permissions` además de roles. La base de datos ya tiene `permissions` y `role_permissions`.

PENDIENTE_PERIODICO: configurar secrets reales de `DATABASE_URL`, `REDIS_URL` y `NEON_BACKUP_DATABASE_URL` en ambientes reales.

PENDIENTE_PERIODICO: definir política de retención de backups diario/semanal/mensual y ejecutar restauraciones periódicas de prueba.

PENDIENTE_PERIODICO: añadir alertas externas ante fallo del workflow de backup, worker o healthcheck. Puede ser Slack, email, PagerDuty u otro canal.

## Ya no pendiente en esta entrega

- Redis cache e invalidación explícita.
- Smoke DB y HTTP.
- Security smoke.
- Pruebas unitarias y de contratos.
- Worker real CLI para outbox con lock Redis.
- Auditoría de intentos de login.
- Refresh token rotation + logout.
- Health live/ready.
- CI con PostgreSQL + Redis.
- Postman con flujos ampliados.
