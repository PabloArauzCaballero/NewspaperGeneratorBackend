# Consolidación final incluida desde el error de GitHub Actions

Este paquete final incluye todas las correcciones realizadas desde el problema original del workflow que ejecutaba `npm ci`.

## Correcciones incluidas

### CI con Yarn

- `.github/workflows/ci.yml` usa Yarn mediante Corepack.
- Se reemplazó `npm ci` por instalación con Yarn/Corepack.
- Se reemplazaron comandos `npm run ...` por `yarn ...`.
- Se conserva Node 22 LTS en CI.

### Yarn en Windows

- `.yarnrc.yml` usa `nodeLinker: node-modules`.
- Se evita Yarn Plug'n'Play para NestJS en Windows.
- `postman:validate` ya no depende de `python3`; usa `tsx scripts/validate-postman.ts`.

### Seeds

- Corregido `:adminRole`, `:editorRole`, `:journalistRole`, `:commercialEditorRole`, `:readerRole` en el seeder base.
- Seed idempotente para poder reiniciar la base sin datos duplicados.

### Smokes

- HTTP smoke aislado con usuario efímero para checkout.
- Security smoke aislado con `User-Agent` único por corrida.
- El rate limit ya no contamina `test:all`.
- DB smoke valida reglas premium, publicidad, búsqueda, notificaciones, backup, auth hardening, worker y batch records.

### Worker

- Worker de outbox corregido para `ts-node`.
- `RedisCacheService` reforzado con inyección explícita de `ConfigService`.
- `start:worker:events:once` queda incluido en `test:all`.

### Escrituras atómicas

- Registro, login, suscripciones, publicidad, artículos, comentarios, analítica y revocación de tokens revisados para evitar escrituras fragmentadas.
- Se agregó contrato `test/contracts/atomic-write-contracts.test.ts`.

### Registros batch

- Nueva migración `20260627000700-create-api-write-batches.js`.
- Nuevas tablas `api_write_batches` y `api_write_batch_items`.
- Triggers por tabla para registrar escrituras agrupadas por transacción PostgreSQL.
- Nuevo endpoint `GET /api/v1/admin/audit/write-batches`.
- Postman actualizado.
- Smoke DB y contratos actualizados.

## Comando final de validación

```powershell
yarn test:all
```

Antes de correrlo desde cero:

```powershell
docker compose down -v
docker compose up -d postgres redis
yarn db:migrate
yarn db:seed
yarn start:dev
```

En otra terminal:

```powershell
yarn test:all
```
