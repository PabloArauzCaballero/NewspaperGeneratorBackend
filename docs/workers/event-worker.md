# Worker event-driven de outbox

El backend ya no depende solo del endpoint manual `POST /admin/events/dispatch-pending`. Ahora incluye un worker ejecutable por CLI para producción o staging.

## Comandos

Ejecutar una sola tanda:

```bash
yarn start:worker:events:once
```

Ejecutar en modo loop:

```bash
yarn start:worker:events
```

## Variables

```env
WORKER_EVENTS_BATCH_SIZE=25
WORKER_EVENTS_INTERVAL_MS=5000
WORKER_LOCK_TTL_SECONDS=45
WORKER_NAME=event-outbox-worker
```

## Qué hace

1. Toma eventos `pending` de `event_outbox`.
2. Respeta `next_retry_at`.
3. Procesa consumidores idempotentes por `event_inbox`.
4. Genera notificaciones según audiencia:
   - noticia pública: usuarios registrados activos;
   - noticia premium: solo usuarios premium activos.
5. Reindexa documentos de búsqueda.
6. Invalida Redis para artículos, ads y analítica.
7. Registra cada corrida en `worker_runs`.
8. Usa lock Redis para evitar dos workers procesando la misma tanda en paralelo.

## Observabilidad

Consultar corridas:

```bash
curl http://localhost:3000/api/v1/admin/security/worker-runs \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

## Nota de producción

Para producción seria, este worker debe correr como proceso separado del API, por ejemplo:

- Render background worker.
- ECS/Fargate service separado.
- Kubernetes Deployment separado.
- PM2 process separado.

No debe depender de que alguien pulse manualmente un endpoint en Postman.
