# Backend Development Context — Periódico Digital Premium Event-Driven

## Stack recomendado

- NestJS.
- TypeScript strict.
- PostgreSQL.
- Sequelize.
- Zod para validación.
- JWT o sesiones seguras.
- Guards para RBAC.
- Redis para cache, rate limiting y colas ligeras si aplica.
- S3 compatible para multimedia.
- Event bus/queue para arquitectura event-driven.

## Estructura de módulos backend

```text
src/
  auth/
  users/
  roles/
  articles/
  categories/
  tags/
  media/
  subscriptions/
  payments/
  comments/
  reactions/
  ads/
  notifications/
  events/
  audit/
  analytics/
  search/
  cache/
  common/
```

## Reglas de implementación

1. No crear endpoints sin validación Zod/DTO.
2. No exponer contenido premium completo en endpoints públicos.
3. No permitir comentarios o reacciones sin autenticación.
4. No permitir publicidad en notas premium.
5. Toda publicación/despublicación debe auditarse.
6. Toda publicación debe escribir en `event_outbox`.
7. Los workers deben ser idempotentes usando `event_inbox`.
8. Las operaciones críticas deben tener correlation id.
9. Los pagos deben procesarse con webhooks idempotentes.
10. Las imágenes/videos deben validarse antes de almacenarse.

## Módulo articles

Debe manejar:

- Crear borrador.
- Editar artículo.
- Gestionar multimedia.
- Gestionar tags/categoría.
- Enviar a revisión.
- Aprobar.
- Publicar.
- Despublicar.
- Archivar.
- Resolver acceso público/premium.
- Emitir eventos.

## Módulo subscriptions

Debe manejar:

- Planes.
- Suscripciones.
- Activación.
- Vencimiento.
- Cancelación.
- Validación de acceso premium.

`isPremium(userId)` no debe mirar solo roles. Debe revisar suscripción activa.

## Módulo ads

Debe manejar:

- Anuncios.
- Ubicaciones.
- Campañas.
- Activación/pausa.
- Validación anti-invasiva.
- Impresiones únicamente en artículos públicos.

## Módulo notifications

Debe manejar:

- Preferencias.
- Lotes.
- Envío.
- Estados.
- Reintentos.
- Audiencias según tipo de artículo.

## Módulo events

Debe manejar:

- Event outbox.
- Event inbox.
- Dispatcher.
- Publicador.
- Consumidores base.
- Idempotencia.
- Reintentos.
- Dead-letter si aplica.

## Endpoints base sugeridos

### Artículos internos

- `POST /admin/articles`
- `PATCH /admin/articles/:id`
- `POST /admin/articles/:id/submit-review`
- `POST /admin/articles/:id/approve`
- `POST /admin/articles/:id/publish`
- `POST /admin/articles/:id/unpublish`

### Artículos públicos

- `GET /articles`
- `GET /articles/:slug`
- `GET /premium/articles/:slug`

### Comentarios y reacciones

- `POST /articles/:id/comments`
- `POST /articles/:id/reactions`

### Suscripciones

- `GET /subscription-plans`
- `POST /subscriptions/checkout`
- `POST /payments/webhook`
- `GET /me/subscription`

### Publicidad

- `POST /admin/ads`
- `PATCH /admin/ads/:id`
- `POST /admin/ads/:id/activate`
- `POST /admin/ads/:id/pause`
- `GET /ads/slots?articleId=...`

El endpoint `/ads/slots` debe devolver vacío si el artículo es premium.
