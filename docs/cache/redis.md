# Redis cache — implementación real

## Objetivo

Redis se usa para acelerar lecturas públicas y de catálogo sin cambiar la regla central del negocio: **el contenido premium nunca puede filtrarse a usuarios sin suscripción activa**.

## Variables

```env
REDIS_URL=redis://localhost:6379
CACHE_PREFIX=newspaper
CACHE_TTL_SECONDS=300
```

Si `REDIS_URL` no existe, la API arranca igual y `GET /health` reporta Redis como `disabled`. Esto permite levantar ambientes mínimos sin bloquear desarrollo.

## Dónde se usa Redis

| Dominio | Cacheado | TTL | Motivo |
|---|---:|---:|---|
| `GET /articles` | Sí | 120s | Listado público consultado con alta frecuencia. No incluye cuerpo premium. |
| `GET /articles/:slug` anónimo | Sí | 60–120s | Cachea detalle público o preview premium redacted. No cachea respuestas con usuario. |
| `GET /categories` | Sí | 300s | Catálogo de baja variación. |
| `GET /tags` | Sí | 300s | Catálogo de baja variación. |
| `GET /subscriptions/plans` | Sí | 600s | Planes públicos de baja variación. |

## Invalidación

La invalidación borra patrones por prefijo seguro:

- `newspaper:articles:*`
- `newspaper:ads:*`
- `newspaper:analytics:*`
- `newspaper:categories:*`
- `newspaper:tags:*`

Se ejecuta en estos casos:

1. Crear/actualizar/publicar/despublicar/archivar artículo.
2. Adjuntar media a artículo.
3. Crear/actualizar categoría.
4. Crear tag.
5. Procesar eventos del outbox relacionados con publicación/actualización.
6. Llamar manualmente `POST /admin/cache-invalidation/articles/:id`.

## Regla premium

Redis **no cachea** respuestas autenticadas de contenido premium. Para artículo premium sin login se cachea solo la vista previa con:

```json
{
  "body": null,
  "audioTranscript": null,
  "ads": [],
  "access": { "allowed": false }
}
```

## Healthcheck

`GET /health` devuelve:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": {
    "status": "ok",
    "latencyMs": 2
  }
}
```

Valores posibles de Redis:

- `ok`: conectado y respondió `PONG`.
- `disabled`: no se configuró `REDIS_URL`.
- `error`: Redis está configurado, pero no responde.

## Comandos útiles

```bash
# Levantar Redis local
docker compose up -d redis

# Verificar health
curl http://localhost:3000/api/v1/health

# Invalidar cache manualmente
curl -X POST http://localhost:3000/api/v1/admin/cache-invalidation/articles/<ARTICLE_ID> \
  -H "Authorization: Bearer <TOKEN_EDITOR>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"refresh manual después de editar artículo"}'
```
