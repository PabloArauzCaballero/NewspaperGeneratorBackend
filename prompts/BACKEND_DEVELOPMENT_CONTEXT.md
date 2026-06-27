# BACKEND_DEVELOPMENT_CONTEXT — Periódico Digital Premium

## Rol

Actúa como desarrollador backend senior en NestJS. Construye módulos mantenibles, seguros y auditables para una plataforma editorial premium.

## Stack

- NestJS.
- TypeScript strict.
- Sequelize.
- PostgreSQL.
- Zod.
- JWT.
- Swagger/OpenAPI.
- Tests unitarios o smoke tests.

## Módulos esperados

- `auth`: login, registro, JWT, guards.
- `users`: lectores, usuarios internos, estados.
- `roles`: RBAC.
- `articles`: artículos, estados, publicación, acceso público/premium.
- `article-versions`: historial/versiones.
- `categories`: categorías.
- `tags`: tags y relación artículo-tag.
- `media`: imágenes/videos/metadatos.
- `subscriptions`: planes, suscripciones, vigencia.
- `payments`: pagos y webhooks del proveedor definido.
- `comments`: comentarios con login y moderación.
- `reactions`: reacciones con login y control de duplicados.
- `ads`: publicidad discreta.
- `analytics`: métricas básicas.
- `audit`: auditoría de acciones críticas.

## Reglas obligatorias

- No exponer contenido premium completo si el usuario no tiene suscripción activa.
- No permitir comentar sin autenticación.
- No permitir reaccionar sin autenticación.
- No modelar premium solo como rol; validar suscripción activa.
- No permitir publicidad invasiva desde backend: validar tipo, ubicación, tamaño y estado.
- No permitir publicación/despublicación sin permisos.
- Sanitizar/validar contenido y comentarios.
- Validar archivos multimedia.
- Registrar auditoría en acciones críticas.

## Endpoints mínimos sugeridos

- `POST /auth/register`
- `POST /auth/login`
- `GET /articles`
- `GET /articles/:slug`
- `POST /admin/articles`
- `PATCH /admin/articles/:id`
- `POST /admin/articles/:id/publish`
- `POST /admin/articles/:id/unpublish`
- `POST /articles/:id/comments`
- `POST /articles/:id/reactions`
- `GET /subscriptions/plans`
- `POST /subscriptions/checkout`
- `POST /payments/webhooks/:provider`
- `POST /admin/ads`
- `PATCH /admin/ads/:id`

Los endpoints exactos deben documentarse en `docs/endpoints/endpoints.md`.

## Validación final backend

Antes de entregar backend:

- Ejecuta build/test si el entorno lo permite.
- Incluye migraciones.
- Incluye seeds mínimos seguros.
- Documenta endpoints.
- Documenta pendientes.
- No uses datos reales.
- No hardcodees secretos.
