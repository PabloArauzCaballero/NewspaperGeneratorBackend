# Endpoints implementados — Backend periódico digital premium

Base URL local:

```txt
http://localhost:3000/api/v1
```

Swagger:

```txt
http://localhost:3000/api/v1/docs
```

## Salud

- `GET /health`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` — requiere JWT.

## Usuarios internos

Requiere JWT y rol indicado por endpoint.

- `GET /admin/users` — `admin`, `editor`.
- `GET /admin/users/:id` — `admin`, `editor`.
- `PATCH /admin/users/:id/status` — `admin`.
- `POST /admin/users/:id/roles` — `admin`.
- `POST /admin/users/:id/roles/remove` — `admin`.

## Roles y permisos

- `GET /admin/roles-permissions/roles` — `admin`.
- `GET /admin/roles-permissions/permissions` — `admin`.
- `POST /admin/roles-permissions/permissions` — `admin`.
- `POST /admin/roles-permissions/roles/:roleName/permissions` — `admin`.
- `DELETE /admin/roles-permissions/roles/:roleName/permissions` — `admin`.

SUPUESTO_PERIODICO: el control efectivo se mantiene por roles NestJS en esta fase; la tabla de permisos queda lista para crecer a permisos granulares.

## Artículos públicos y premium

- `GET /articles`
  - Filtros: `category`, `tag`, `accessType`, `q`, `limit`, `offset`.
  - Nunca devuelve `body`, por lo tanto no filtra contenido premium.
- `GET /articles/:slug`
  - Público: devuelve cuerpo completo.
  - Premium sin suscripción activa: devuelve `body: null`, `audioTranscript: null` y `ads: []`.
  - Premium con suscripción activa: devuelve cuerpo completo y `ads: []`.
- `GET /premium/articles/:slug` — requiere JWT y suscripción activa.

## Artículos internos CMS

- `GET /admin/articles` — `admin`, `editor`, `journalist`.
- `GET /admin/articles/:id` — `admin`, `editor`, `journalist`.
- `POST /admin/articles` — crea borrador y emite `ArticleDraftCreated`.
- `PATCH /admin/articles/:id` — actualiza contenido, tags y snapshot.
- `POST /admin/articles/:id/submit-review` — emite `ArticleSubmittedForReview`.
- `POST /admin/articles/:id/request-changes` — `admin`, `editor`; emite `ArticleChangesRequested`.
- `POST /admin/articles/:id/approve` — `admin`, `editor`; emite `ArticleApproved`.
- `POST /admin/articles/:id/schedule` — `admin`, `editor`; emite `ArticleScheduled`.
- `POST /admin/articles/:id/publish` — `admin`, `editor`; emite `PublicArticlePublished` o `PremiumArticlePublished` y evento de publicidad según acceso.
- `POST /admin/articles/:id/unpublish` — `admin`, `editor`; emite `ArticleUnpublished`.
- `POST /admin/articles/:id/archive` — `admin`, `editor`; archiva sin borrado físico.
- `POST /admin/articles/:id/media` — vincula multimedia al artículo.

## Categorías y tags

- `GET /categories`
- `GET /tags`
- `GET /admin/categories` — `admin`, `editor`.
- `POST /admin/categories` — `admin`, `editor`.
- `PATCH /admin/categories/:id` — `admin`, `editor`.
- `GET /admin/tags` — `admin`, `editor`, `journalist`.
- `POST /admin/tags` — `admin`, `editor`, `journalist`.

## Multimedia

- `GET /admin/media` — `admin`, `editor`, `journalist`.
- `POST /admin/media` — registra un asset ya disponible por URL validada.

SUPUESTO_PERIODICO: esta fase no sube bytes a S3; registra URLs seguras para dejar preparada la integración real de storage.

## Comentarios

- `GET /articles/:id/comments` — público si el artículo es público; premium requiere suscripción activa.
- `POST /articles/:id/comments` — requiere JWT; premium requiere suscripción activa; crea comentario en `pending_moderation`.
- `GET /admin/comments` — `admin`, `editor`.
- `POST /admin/comments/:id/moderate` — `admin`, `editor`.

## Reacciones

- `GET /articles/:id/reactions` — devuelve conteo y reacción propia si hay token.
- `POST /articles/:id/reactions` — requiere JWT; premium requiere suscripción activa.
- `DELETE /articles/:id/reactions` — requiere JWT.

## Suscripciones

- `GET /subscriptions/plans`
- `GET /subscriptions/me` — requiere JWT.
- `POST /subscriptions/checkout` — requiere JWT; crea suscripción `pending_payment` y transacción demo.
- `POST /admin/subscriptions/activate-manual` — `admin`.
- `POST /admin/subscriptions/:id/cancel` — `admin`.

PENDIENTE_PERIODICO: proveedor de pago real, renovación automática, reembolsos y facturación formal siguen pendientes de decisión de negocio.

## Pagos

- `POST /payments/webhook` — idempotente por `provider + externalEventId`.
- `GET /admin/payments` — `admin`.

## Publicidad

- `GET /ads/slots?articleSlug=<slug>` o `GET /ads/slots?articleId=<uuid>`.
  - Registra impresión solo si el artículo es público.
  - Si el artículo es premium, devuelve `ads: []`.
- `GET /admin/ads` — `admin`, `commercial_editor`.
- `GET /admin/ads/placements` — `admin`, `commercial_editor`.
- `POST /admin/ads` — `admin`, `commercial_editor`.
- `PATCH /admin/ads/:id` — `admin`, `commercial_editor`.
- `POST /admin/ads/:id/activate` — `admin`, `commercial_editor`.
- `POST /admin/ads/:id/pause` — `admin`, `commercial_editor`.

Reglas aplicadas:

- No se aceptan títulos con `popup`.
- Los anuncios solo apuntan a ubicaciones permitidas.
- Un trigger SQL impide impresiones en artículos premium.

## Notificaciones

- `GET /notifications` — requiere JWT.
- `POST /notifications/:id/read` — requiere JWT.
- `GET /notifications/preferences` — requiere JWT.
- `POST /notifications/preferences` — requiere JWT.
- `GET /admin/notifications/batches` — `admin`, `editor`.

## Eventos event-driven

- `GET /admin/events/outbox?status=pending|published|failed|consumed` — `admin`.
- `GET /admin/events/inbox` — `admin`.
- `POST /admin/events/dispatch-pending` — `admin`; procesa notificaciones, búsqueda y cache de forma idempotente.
- `POST /admin/events/outbox/:id/retry` — `admin`.

SUPUESTO_PERIODICO: el dispatcher HTTP es una herramienta operativa temporal para pruebas locales; en producción debe ejecutarse como worker/cola real.

## Auditoría

- `GET /admin/audit/logs` — `admin`, `editor`.

## Analítica

- `POST /analytics/articles/:id/view` — opcional JWT; premium requiere suscripción activa.
- `GET /admin/analytics/articles` — `admin`, `editor`.

## Search indexing

- `GET /admin/search-indexing/documents` — `admin`, `editor`.
- `POST /admin/search-indexing/articles/:id/rebuild` — `admin`, `editor`.

Regla aplicada: para artículos premium el índice no guarda el cuerpo completo, solo metadatos seguros.

## Cache invalidation

- `GET /admin/cache-invalidation/jobs` — `admin`, `editor`.
- `POST /admin/cache-invalidation/articles/:id` — `admin`, `editor`.

## Redis y health operativo

Redis no tiene endpoints públicos directos. Se opera mediante:

- `GET /health` — reporta `redis.status` como `ok`, `disabled` o `error`.
- `POST /admin/cache-invalidation/articles/:id` — invalida cache Redis relacionado con artículos, ads y analítica.
- `POST /admin/events/dispatch-pending` — el worker local de cache borra Redis cuando consume eventos relevantes.

Documentación específica: `docs/cache/redis.md`.

## Backup operacional a Neon

No es endpoint HTTP. Se ejecuta por CLI o GitHub Actions:

```bash
yarn backup:neon
```

Workflow:

```txt
.github/workflows/neon-backup.yml
```

Tabla de auditoría:

```txt
database_backup_runs
```

Documentación específica: `docs/backup/neon-backup-job.md`.

## Smoke tests y Postman

Smoke DB:

```bash
yarn test:smoke:db
```

Smoke HTTP:

```bash
yarn test:smoke:http
```

Postman:

```txt
postman/NewspaperGeneratorBackend.postman_collection.json
postman/NewspaperGeneratorBackend.local.postman_environment.json
```

Documentación específica:

- `docs/testing/smoke-tests.md`
- `docs/postman/postman-guide.md`

# Endpoints añadidos para entrega 10/10

## Auth endurecido

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/refresh` | No | Rota refresh token y devuelve access token nuevo. |
| POST | `/api/v1/auth/logout` | Bearer | Revoca el refresh token enviado. |
| POST | `/api/v1/auth/request-password-reset` | No | Genera token de reset. En no-producción devuelve `debugResetToken`. |
| POST | `/api/v1/auth/reset-password` | No | Cambia contraseña, consume token de reset y revoca refresh tokens activos. |

## Health probes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health/live` | Liveness: el proceso responde. |
| GET | `/api/v1/health/ready` | Readiness: verifica DB y Redis si está configurado. |

## Seguridad admin

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/admin/security/login-attempts` | Admin | Lista intentos de login con filtros. |
| GET | `/api/v1/admin/security/users/:id/refresh-tokens` | Admin | Lista refresh tokens emitidos para un usuario. |
| POST | `/api/v1/admin/security/users/:id/revoke-refresh-tokens` | Admin | Revoca refresh tokens activos de un usuario. |
| GET | `/api/v1/admin/security/worker-runs` | Admin | Lista corridas del worker event-driven. |

## Worker event-driven

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/admin/events/worker/run-once` | Admin | Ejecuta una tanda del worker con lock Redis y registra `worker_runs`. |

También existe CLI:

```bash
yarn start:worker:events:once
yarn start:worker:events
```
