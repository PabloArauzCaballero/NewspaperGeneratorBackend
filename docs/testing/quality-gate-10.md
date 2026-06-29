# Quality gate 10/10

Este backend queda con una ruta clara para demostrar calidad real antes de entrega.

## Comando completo

Con PostgreSQL, Redis y el servidor levantado:

```bash
yarn test:all
```

Este comando ejecuta:

1. `yarn typecheck`
2. `yarn build`
3. `yarn test:unit`
4. `yarn test:contracts`
5. `yarn test:smoke:db`
6. `yarn test:smoke:http`
7. `yarn test:security`
8. `yarn audit:moderate --audit-level=moderate`

## Preparación local desde cero

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
yarn db:migrate
yarn db:seed
yarn typecheck
yarn build
yarn test:unit
yarn test:contracts
yarn db:validate
yarn postman:validate
yarn audit:moderate --audit-level=moderate
yarn test:smoke:db
yarn start:dev
```

En otra terminal:

```bash
yarn test:smoke:http
yarn test:security
yarn start:worker:events:once
```

## Qué cubren las pruebas

### Unitarias

- Validación Zod de auth y artículos.
- Normalización de emails.
- Generación segura de slug.
- Contratos de paginación.
- Headers de seguridad.
- Propagación segura de request id.

### Contratos

- Postman contiene flujos críticos.
- Migraciones tienen tablas de hardening.
- `event_inbox.last_error` no está duplicado.
- `package.json` expone comandos de quality gate.

### Smoke DB

- Seeds mínimos existen.
- Usuario premium tiene suscripción activa.
- No hay impresiones de ads sobre artículos premium.
- Notificaciones premium no llegan a usuarios no premium.
- Existen tablas operativas: backup, refresh tokens, login attempts y worker runs.

### Smoke HTTP

- Health live/ready.
- Login, refresh y logout.
- Paywall público/premium.
- Publicidad cero para premium.
- Errores de negocio `400/401/403/404/409`.
- Checkout + webhook demo idempotente.
- Dispatcher y worker de eventos.
- Invalidación Redis.
- Seguridad admin.

### Security smoke

- Headers de seguridad.
- Error envelope uniforme.
- Request id.
- Rate limiting de auth.

## CI

El workflow `.github/workflows/ci.yml` levanta PostgreSQL + Redis y corre el quality gate automáticamente en push y pull request.
