# Quality gate 10/10

Este backend queda con una ruta clara para demostrar calidad real antes de entrega.

## Comando completo

Con PostgreSQL, Redis y el servidor levantado:

```bash
npm run test:all
```

Este comando ejecuta:

1. `npm run typecheck`
2. `npm run build`
3. `npm run test:unit`
4. `npm run test:contracts`
5. `npm run test:smoke:db`
6. `npm run test:smoke:http`
7. `npm run test:security`
8. `npm audit --audit-level=moderate`

## Preparación local desde cero

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run db:seed
npm run typecheck
npm run build
npm run test:unit
npm run test:contracts
npm run db:validate
npm run postman:validate
npm audit --audit-level=moderate
npm run test:smoke:db
npm run start:dev
```

En otra terminal:

```bash
npm run test:smoke:http
npm run test:security
npm run start:worker:events:once
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
