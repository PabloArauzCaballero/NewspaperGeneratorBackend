# Flujos backend implementados

## Publicación event-driven

1. Editor/admin ejecuta `POST /admin/articles/:id/publish`.
2. Se actualiza `articles.status = published` y `published_at = now()`.
3. En la misma transacción se inserta un evento en `event_outbox`.
4. Si el artículo es público se emite `PublicArticlePublished` y `PublicAdSlotsEnabled`.
5. Si el artículo es premium se emite `PremiumArticlePublished` y `PremiumAdSlotsDisabled`.
6. El dispatcher/worker procesa outbox de manera idempotente usando `event_inbox`.
7. Se generan notificaciones, documento de búsqueda seguro y job de invalidación de cache.

## Acceso premium

1. Listados públicos nunca devuelven cuerpo.
2. Detalle público devuelve cuerpo completo.
3. Detalle premium valida JWT opcional y luego suscripción activa.
4. Si no hay suscripción activa, se devuelven metadatos seguros y `body: null`.
5. Los endpoints específicos `/premium/articles/:slug`, comentarios, reacciones y analítica premium requieren suscripción activa.

## Publicidad

1. `/ads/slots` resuelve el artículo.
2. Si el artículo es premium, devuelve `ads: []`.
3. Si el artículo es público, busca anuncios activos, discretos y por categoría.
4. La impresión se registra solo para contenido público.
5. Un trigger SQL bloquea cualquier impresión sobre artículos premium.
