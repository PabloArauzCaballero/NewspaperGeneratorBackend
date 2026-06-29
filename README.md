# NewspaperGeneratorBackend

Backend NestJS para el **Periódico Digital Premium**. Esta versión queda endurecida como entrega 10/10 de MVP serio: CMS, paywall, suscripciones demo, publicidad discreta, comentarios, reacciones, notificaciones, auditoría, analítica, Redis, outbox/inbox event-driven, worker CLI, seguridad HTTP, refresh tokens y quality gate automatizado.

## Stack respetado

- NestJS + TypeScript strict.
- Sequelize + PostgreSQL.
- Zod para validación.
- JWT para autenticación.
- Swagger/OpenAPI.
- Redis real para cache de lecturas públicas, catálogos e invalidación operativa.
- Smoke tests DB + HTTP + security para reglas de negocio, errores esperados y hardening.
- Job de backup a otro proyecto Neon DB con GitHub Actions.
- Postman collection importable con tests y variables automáticas.
- Docker Compose con PostgreSQL y Redis local.
- Monolito modular backend preparado para evolución event-driven.
- Refresh tokens opacos con rotación, logout, reset password y auditoría de intentos de login.
- Worker CLI real para procesar outbox con lock Redis.
- CI con PostgreSQL + Redis en GitHub Actions.
- `yarn audit:moderate --audit-level=moderate` queda limpio en esta entrega.

## Módulos implementados

- `auth`
- `users`
- `roles-permissions`
- `articles`
- `categories`
- `tags`
- `media`
- `subscriptions`
- `payments`
- `comments`
- `reactions`
- `ads`
- `notifications`
- `events`
- `audit`
- `analytics`
- `search-indexing`
- `cache-invalidation`
- `cache`
- `security`
- `health`
- `backup-to-neon` vía script operativo

## Credenciales demo

Todas usan la contraseña:

```txt
DemoPassword2026!
```

| Rol | Email |
|---|---|
| Admin | `admin.demo@periodico.test` |
| Editora | `editor.demo@periodico.test` |
| Periodista | `periodista.demo@periodico.test` |
| Comercial | `comercial.demo@periodico.test` |
| Lector registrado | `lector.demo@periodico.test` |
| Lector premium activo | `premium.demo@periodico.test` |

## Arranque local

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
yarn db:migrate
yarn db:seed
yarn start:dev
```

Servidor:

```txt
http://localhost:3000/api/v1
```

Swagger:

```txt
http://localhost:3000/api/v1/docs
```

## Validación local 10/10

Primero valida sin servidor:

```bash
yarn db:validate
yarn postman:validate
yarn typecheck
yarn build
yarn test:unit
yarn test:contracts
yarn audit:moderate --audit-level=moderate
yarn test:smoke:db
```

Luego levanta el servidor:

```bash
yarn start:dev
```

En otra terminal ejecuta:

```bash
yarn test:smoke:http
yarn test:security
yarn start:worker:events:once
```

Quality gate completo, con PostgreSQL + Redis + servidor levantado:

```bash
yarn test:all
```

En GitHub Actions, `.github/workflows/ci.yml` levanta PostgreSQL y Redis y ejecuta el quality gate automáticamente.

## Pruebas manuales rápidas

Login admin:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@periodico.test","password":"DemoPassword2026!"}'
```

Listado público sin filtrar cuerpo premium:

```bash
curl http://localhost:3000/api/v1/articles
```

Detalle premium sin token: debe devolver `body: null`.

```bash
curl http://localhost:3000/api/v1/articles/informe-especial-premium-cambio-consumo-informativo
```

Detalle premium con token del usuario premium: debe devolver el cuerpo completo.

```bash
curl http://localhost:3000/api/v1/articles/informe-especial-premium-cambio-consumo-informativo \
  -H "Authorization: Bearer <TOKEN_PREMIUM>"
```

Ads en artículo premium: debe devolver arreglo vacío.

```bash
curl "http://localhost:3000/api/v1/ads/slots?articleSlug=informe-especial-premium-cambio-consumo-informativo"
```

Despachar eventos pendientes localmente con endpoint admin:

```bash
curl -X POST http://localhost:3000/api/v1/admin/events/dispatch-pending \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'
```

Procesar outbox con worker real:

```bash
yarn start:worker:events:once
# o en loop
yarn start:worker:events
```

## Auth de producción

Endpoints nuevos:

```txt
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/request-password-reset
POST /api/v1/auth/reset-password
GET  /api/v1/admin/security/login-attempts
GET  /api/v1/admin/security/worker-runs
```

El login devuelve `accessToken` y `refreshToken`. El refresh rota el token anterior y logout lo revoca. Los intentos fallidos se auditan y pueden bloquear temporalmente la cuenta.

## Redis

Redis queda activo en local con Docker Compose:

```bash
docker compose up -d redis
curl http://localhost:3000/api/v1/health
```

El backend arranca aunque Redis no esté configurado, pero el health queda `degraded` si `REDIS_URL` existe y Redis no responde.

## Postman

Importa estos archivos:

```txt
postman/NewspaperGeneratorBackend.postman_collection.json
postman/NewspaperGeneratorBackend.local.postman_environment.json
```

Orden recomendado: Health → Auth → Fixtures → Público/Premium → Interacciones → Suscripciones/Pagos → Admin CMS → Eventos/Redis → Errores de negocio.

## Backup a Neon DB

Configura un segundo proyecto/base Neon y coloca sus credenciales en `NEON_BACKUP_DATABASE_URL`.

```bash
yarn backup:neon
```

GitHub Actions queda en:

```txt
.github/workflows/neon-backup.yml
```

Secrets requeridos:

```txt
DATABASE_URL
NEON_BACKUP_DATABASE_URL
```

## Documentación importante

- Endpoints: `docs/endpoints/endpoints.md`
- Redis: `docs/cache/redis.md`
- Smoke tests: `docs/testing/smoke-tests.md`
- Quality gate 10/10: `docs/testing/quality-gate-10.md`
- Seguridad producción: `docs/security/production-hardening.md`
- Worker event-driven: `docs/workers/event-worker.md`
- Backup Neon: `docs/backup/neon-backup-job.md`
- Postman: `docs/postman/postman-guide.md`
- Supuestos: `docs/architecture/assumptions.md`
- Flujos: `docs/architecture/flows.md`
- Pendientes: `docs/pending/pending-items.md`

## Notas importantes

- No se creó endpoint para seedear desde HTTP. Los seeds se ejecutan por CLI.
- Los precios de planes son demo.
- El proveedor de pagos real todavía está pendiente si se requiere integración bancaria externa; el flujo demo mantiene idempotencia.
- El dispatcher HTTP queda para operación/admin, pero producción debe usar `yarn start:worker:events` como proceso separado.
- El job de backup a Neon requiere configurar un target de respaldo distinto a la base principal.
- El cuerpo premium no se expone en listados, búsqueda ni publicidad.

## Integridad atómica de endpoints

Se reforzó la política de escritura para evitar datos fragmentados entre tablas. Revisa:

```txt
docs/quality/atomic-write-integrity.md
```

Los endpoints críticos que escriben en varias tablas ahora validan filas padre antes de tocar tablas hijas y agrupan mutación + auditoría + outbox en una misma transacción SQL. Para comprobar los contratos estáticos:

```bash
yarn test:contracts
```

## Integridad final: registros batch de escritura

La versión final incluye observabilidad de escrituras agrupadas por transacción mediante:

- `api_write_batches`
- `api_write_batch_items`
- triggers de base de datos por tabla de negocio
- endpoint admin `GET /api/v1/admin/audit/write-batches`
- validación en `yarn test:smoke:db`
- contrato en `test/contracts/atomic-write-contracts.test.ts`

Esto permite verificar que operaciones multi-tabla como registro de usuario, checkout de suscripción, publicación editorial, auditoría, outbox y tokens no queden como datos fragmentados sin trazabilidad.

Consulta la documentación completa en:

- `docs/quality/atomic-write-integrity.md`
- `docs/quality/batch-write-records.md`
- `docs/quality/final-consolidation-from-github-fix.md`
