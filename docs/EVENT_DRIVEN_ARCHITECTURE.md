# Arquitectura event-driven — Periódico Digital Premium

## Objetivo

Diseñar el backend para que los procesos críticos de publicación, notificación, cache, búsqueda, publicidad y analítica estén desacoplados mediante eventos.

La publicación de una noticia debe ser rápida y confiable. El usuario editorial no debe esperar a que el sistema notifique lectores, actualice buscadores, calcule métricas o habilite publicidad.

## Componentes event-driven

### Event Outbox

Tabla transaccional donde los módulos escriben eventos de dominio junto con el cambio de negocio.

Ejemplo: al publicar una noticia, en la misma transacción se actualiza `articles.status = published` y se inserta `ArticlePublished` en `event_outbox`.

### Outbox Dispatcher

Worker que lee eventos pendientes de `event_outbox`, los publica al bus/cola y marca el evento como publicado.

### Event Bus / Queue

Infraestructura de mensajería. Puede ser SQS, SNS, EventBridge, RabbitMQ, Kafka o BullMQ/Redis para una primera versión.

### Event Inbox

Tabla por consumidor o global donde se registra qué eventos ya fueron procesados. Evita efectos duplicados.

### Workers consumidores

- `notification-worker`
- `search-index-worker`
- `cache-worker`
- `analytics-worker`
- `ads-worker`
- `audit-worker`

## Flujo ArticlePublished

1. Editor publica artículo.
2. Backend valida permisos.
3. Backend cambia estado a `published`.
4. Backend inserta `ArticlePublished` en `event_outbox`.
5. Outbox dispatcher publica evento.
6. Workers consumen evento.
7. Según access type:
   - Público: se habilita publicidad y se notifica a registrados activos.
   - Premium: se bloquea publicidad y se notifica solo a suscriptores activos.

## Eventos mínimos

### Usuarios

- `UserRegistered`
- `UserLoggedIn`
- `UserSuspended`
- `UserBlocked`

### Suscripciones

- `SubscriptionPaymentStarted`
- `SubscriptionPaymentSucceeded`
- `SubscriptionPaymentFailed`
- `SubscriptionActivated`
- `SubscriptionExpired`
- `SubscriptionCancelled`

### Artículos

- `ArticleDraftCreated`
- `ArticleSubmittedForReview`
- `ArticleApproved`
- `ArticleChangesRequested`
- `ArticleScheduled`
- `ArticlePublished`
- `PublicArticlePublished`
- `PremiumArticlePublished`
- `ArticleUnpublished`
- `ArticleUpdatedAfterPublication`

### Publicidad

- `PublicAdSlotsEnabled`
- `PremiumAdSlotsDisabled`
- `AdvertisementActivated`
- `AdvertisementPaused`
- `AdvertisementImpressionRecorded`

### Notificaciones

- `NotificationAudienceResolved`
- `NotificationBatchCreated`
- `NotificationSent`
- `NotificationFailed`

### Interacciones

- `CommentCreated`
- `CommentModerationRequired`
- `CommentApproved`
- `ReactionCreated`
- `ReactionUpdated`

## Estructura recomendada de evento

```json
{
  "eventId": "uuid",
  "eventType": "ArticlePublished",
  "aggregateType": "Article",
  "aggregateId": "uuid",
  "version": 1,
  "payload": {
    "articleId": "uuid",
    "title": "string",
    "slug": "string",
    "accessType": "public|premium",
    "categoryId": "uuid",
    "publishedAt": "timestamp"
  },
  "correlationId": "uuid",
  "causationId": "uuid",
  "occurredAt": "timestamp"
}
```

## Idempotencia

Todo consumidor debe verificar `event_inbox` antes de procesar. Si el evento ya fue procesado por ese consumidor, debe ignorarlo.

## Reintentos

Los eventos fallidos deben tener:

- `retry_count`
- `next_retry_at`
- `last_error`
- `status = failed | pending | published | consumed`

## Regla de publicidad premium

El worker de publicidad debe aplicar:

```text
if article.accessType == PREMIUM:
    do not create ad slots
    do not record impressions
    emit PremiumAdSlotsDisabled
```

## Regla de notificaciones

```text
if article.accessType == PUBLIC:
    audience = active registered users
else if article.accessType == PREMIUM:
    audience = users with active subscription
```
