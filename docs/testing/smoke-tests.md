# Smoke tests fuertes

Este backend incluye dos niveles de smoke tests. La intención no es reemplazar unit/e2e formales, sino detectar rápido si el sistema base quedó roto después de migraciones, seeds, Redis, reglas premium, eventos o cambios de endpoints.

## 1. Smoke de base de datos e invariantes de negocio

Comando:

```bash
yarn test:smoke:db
```

Alias:

```bash
yarn test:smoke
```

Valida:

- Conexión a PostgreSQL.
- Mínimo de usuarios demo.
- Roles base.
- Permisos base.
- Artículos públicos y premium publicados.
- Outbox con eventos seed.
- Cero impresiones publicitarias en artículos premium.
- Ads activas solo para contexto público.
- Usuario premium con suscripción activa hasta fecha lejana.
- Article views seed.
- Search index seed.
- Tabla operativa `database_backup_runs` para auditar backups a Neon.
- Password hash de usuario admin demo.
- Notificaciones premium no enviadas a usuarios sin premium activo.

## 2. Smoke HTTP de endpoints y errores de negocio

Primero debe estar corriendo el servidor:

```bash
yarn start:dev
```

En otra terminal:

```bash
yarn test:smoke:http
```

También puedes cambiar el endpoint base:

```bash
API_BASE_URL=http://localhost:3000/api/v1 yarn test:smoke:http
```

Valida:

- `GET /health` con DB OK y Redis reportado.
- Login correcto e incorrecto.
- `GET /auth/me` premium.
- Listado público de artículos.
- Lectura pública sin login.
- Preview premium sin login con `body: null`.
- Acceso premium denegado para lector normal.
- Acceso premium permitido para usuario premium.
- Ads públicas y cero ads premium.
- Lector normal no puede crear artículos admin.
- DTO inválido devuelve `400`.
- Categoría duplicada devuelve `409`.
- Programar artículo en el pasado devuelve `400`.
- Comentarios, reacciones y notificaciones.
- Checkout demo y webhook idempotente.
- Dispatcher outbox/inbox.
- Invalidación Redis vía endpoint admin.

## 3. Smoke completo

Requiere servidor levantado:

```bash
yarn test:smoke:all
```

Ejecuta DB smoke y HTTP smoke.

## Orden recomendado local

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
yarn db:migrate
yarn db:seed
yarn typecheck
yarn build
yarn test:smoke:db
yarn start:dev
# en otra terminal
yarn test:smoke:http
```

## Qué hacer si falla

| Falla | Causa probable | Acción |
|---|---|---|
| `DATABASE_URL is required` | `.env` no cargado | Crear `.env` desde `.env.example`. |
| `Expected at least 6 users` | Seeds no ejecutados | Ejecutar `yarn db:seed`. |
| `Premium article has advertisement impressions` | Regla premium rota | Revisar trigger SQL y `AdsService`. |
| `status 401` en login válido | Password o seed cambiado | Revisar seeder y `BCRYPT_ROUNDS`. |
| Health `redis.error` | Redis apagado | `docker compose up -d redis`. |
| `pg_dump` no encontrado en backup | Falta cliente PostgreSQL | Instalar `postgresql-client`. |

## Ampliación 10/10

Además de los smokes DB/HTTP, esta entrega añade:

```bash
yarn test:unit
yarn test:contracts
yarn test:security
yarn db:validate
yarn postman:validate
yarn start:worker:events:once
```

El comando recomendado para certificar la entrega completa es:

```bash
yarn test:all
```

El smoke HTTP ahora valida también:

- `GET /health/live`
- `GET /health/ready`
- login con `refreshToken`
- rotación con `/auth/refresh`
- logout con revocación
- worker `/admin/events/worker/run-once`
- endpoints admin de seguridad
