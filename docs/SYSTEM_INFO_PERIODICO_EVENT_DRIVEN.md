# SYSTEM INFO — Proyecto Periódico Digital Premium Event-Driven

**Versión:** 1.1 corregida  
**Fecha:** 2026-06-27  
**Documento:** Contexto integral de negocio, producto, backend, eventos, reglas editoriales, premium, publicidad, notificaciones y despliegue.  
**Uso recomendado:** Documento base para arquitectura backend, diseño de base de datos, prompts de desarrollo, PlantUML, APIs, pruebas, roadmap y alineación con cliente.

---

## 1. Identidad del producto

El proyecto consiste en un sistema generador y gestor de artículos web para un periódico digital de alta reputación. La plataforma debe permitir que periodistas, editores y administradores creen, editen, revisen, publiquen y mantengan noticias, columnas y notas especiales con contenido multimedia.

El sistema no debe tratarse como un CRUD simple de noticias. Debe diseñarse como una plataforma editorial digital con CMS, paywall, suscripciones, publicidad discreta, interacción del lector, notificaciones, analítica y arquitectura event-driven.

La idea central del producto es:

> El periódico publica contenido confiable y profesional. Los visitantes pueden leer noticias públicas. Los usuarios registrados pueden comentar y reaccionar. Los usuarios premium acceden a notas especiales protegidas. La publicidad solo aparece en contenido público y siempre de forma discreta. Las notas premium tienen experiencia limpia, sin anuncios.

---

## 2. Reglas principales del negocio

1. Las noticias públicas son visibles para visitantes, usuarios registrados y usuarios premium.
2. Las noticias públicas pueden mostrar publicidad discreta.
3. Las notas premium solo son visibles completas para usuarios logueados con suscripción activa.
4. Las notas premium no muestran publicidad bajo ningún caso.
5. Para comentar se requiere estar logueado.
6. Para reaccionar se requiere estar logueado.
7. En notas premium, además de login, se requiere suscripción activa para comentar o reaccionar.
8. Premium no es un rol fijo; es una condición derivada de una suscripción activa.
9. La publicación de una noticia debe disparar eventos asíncronos.
10. La disponibilidad de una noticia no debe depender de que terminen notificaciones, analítica, publicidad, cache o búsqueda.

---

## 3. Actores

### 3.1 Visitante

Usuario no logueado. Puede leer noticias públicas y ver publicidad discreta. No puede comentar, reaccionar ni leer notas premium completas.

### 3.2 Usuario registrado

Usuario con cuenta activa. Puede leer noticias públicas, comentar y reaccionar en contenido público. Puede elegir un plan de suscripción. No puede leer premium completo si no tiene suscripción activa.

### 3.3 Usuario premium

Usuario registrado con suscripción activa. Puede leer contenido público y premium. Puede comentar y reaccionar en contenido premium si la noticia lo permite. En notas premium no debe ver anuncios.

### 3.4 Periodista

Usuario interno que crea y edita artículos. Puede guardar borradores y enviar a revisión. Según política del periódico, podría publicar directamente o requerir aprobación editorial.

### 3.5 Editor

Usuario interno que revisa, aprueba, publica, despublica y corrige artículos. También puede moderar comentarios.

### 3.6 Administrador

Gestiona roles, usuarios, planes, suscripciones, configuración general, auditoría y parámetros críticos.

### 3.7 Editor comercial / administrador de publicidad

Gestiona anuncios y ubicaciones publicitarias. No debe modificar contenido editorial salvo permiso explícito. La publicidad solo se aplica a contenido público.

### 3.8 Proveedor de pagos

Servicio externo encargado de procesar pagos de suscripciones y enviar confirmaciones o webhooks.

---

## 4. Campos base del artículo

Todo artículo debe soportar:

- Título principal.
- Slug.
- Bajada o resumen.
- Categoría.
- Lista de tags.
- Cuerpo principal o columna.
- Transcripción de audio.
- Lista de imágenes.
- Lista de videos.
- Autor.
- Estado editorial.
- Tipo de acceso: `public` o `premium`.
- Comentarios habilitados o deshabilitados.
- Reacciones habilitadas o deshabilitadas.
- Fecha de publicación.
- Fecha de actualización.

Estados sugeridos:

- `draft`
- `in_review`
- `changes_requested`
- `approved`
- `scheduled`
- `published`
- `unpublished`
- `archived`

Tipos de acceso:

- `public`
- `premium`
- `internal_only` si se requiere para operación interna.

---

## 5. Arquitectura event-driven

El backend debe usar eventos para desacoplar procesos secundarios. Publicar una noticia no debe bloquearse por tareas como enviar notificaciones, indexar búsqueda, invalidar caché, calcular métricas o habilitar publicidad.

### 5.1 Patrón outbox

Cuando se publica una noticia, el servicio de artículos debe:

1. Actualizar el artículo a `published`.
2. Guardar `published_at`.
3. Crear una revisión o snapshot si corresponde.
4. Insertar un evento en `event_outbox` en la misma transacción.
5. Confirmar la transacción.

Luego, un worker lee `event_outbox`, publica al bus de eventos y marca el evento como publicado.

### 5.2 Patrón inbox

Cada consumidor debe registrar en `event_inbox` los eventos que ya procesó. Esto evita duplicados si el bus reintenta entregar un evento.

### 5.3 Eventos principales

- `UserRegistered`
- `UserLoggedIn`
- `SubscriptionPaymentStarted`
- `SubscriptionPaymentSucceeded`
- `SubscriptionActivated`
- `SubscriptionExpired`
- `SubscriptionCancelled`
- `ArticleDraftCreated`
- `ArticleSubmittedForReview`
- `ArticleChangesRequested`
- `ArticleApproved`
- `ArticleScheduled`
- `ArticlePublished`
- `PublicArticlePublished`
- `PremiumArticlePublished`
- `ArticleUnpublished`
- `ArticleUpdatedAfterPublication`
- `PublicAdSlotsEnabled`
- `PremiumAdSlotsDisabled`
- `NotificationAudienceResolved`
- `NotificationBatchCreated`
- `NotificationSent`
- `NotificationFailed`
- `ArticleViewed`
- `PremiumArticleAccessDenied`
- `CommentCreated`
- `CommentModerationRequired`
- `ReactionCreated`

### 5.4 Reglas al publicar

Si `article.access_type = public`:

- Se emite `PublicArticlePublished`.
- Se habilitan espacios de publicidad discreta.
- Se notifica a usuarios registrados activos, premium o no.
- La noticia queda disponible para visitantes.

Si `article.access_type = premium`:

- Se emite `PremiumArticlePublished`.
- Se bloquean espacios publicitarios.
- Se notifica solo a usuarios con suscripción activa.
- La noticia queda disponible solo para usuarios premium activos.
- El frontend/backend no deben solicitar ni renderizar anuncios.

---

## 6. Módulos backend esperados

El backend debe organizarse por dominios:

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
- `health-observability`

El módulo `events` debe exponer la infraestructura interna de outbox, inbox, publicación, reintentos y trazabilidad.

---

## 7. Notificaciones

Las notificaciones se generan de forma asíncrona después de `ArticlePublished`.

### Noticia pública

Audiencia:

- Usuarios registrados activos.
- Usuarios premium activos.

No se notifica a visitantes porque no tienen sesión/cuenta persistente.

### Noticia premium

Audiencia:

- Solo usuarios con suscripción activa.

Nunca se debe notificar una noticia premium a usuarios sin suscripción activa, salvo campañas comerciales explícitas separadas, que no forman parte de este flujo.

---

## 8. Publicidad

La publicidad es discreta y solo se permite en noticias públicas.

Permitido:

- Lateral discreto en desktop.
- Banner inferior no flotante.
- Bloque pequeño al final de la nota.
- Bloque entre secciones con baja frecuencia.

Prohibido:

- Popup.
- Interstitial que bloquea lectura.
- Overlay encima del texto.
- Autoplay con sonido.
- Banner flotante persistente que reduzca legibilidad.
- Cualquier publicidad en notas premium.

---

## 9. Base de datos mínima recomendada

Tablas principales:

- `users`
- `roles`
- `user_roles`
- `subscription_plans`
- `subscriptions`
- `payment_transactions`
- `articles`
- `article_revisions`
- `categories`
- `tags`
- `article_tags`
- `media_assets`
- `article_media`
- `comments`
- `reactions`
- `comment_moderation_logs`
- `advertisement_placements`
- `advertisements`
- `advertisement_category_targets`
- `advertisement_impressions`
- `notification_batches`
- `notifications`
- `user_notification_preferences`
- `event_outbox`
- `event_inbox`
- `audit_logs`

Restricciones críticas:

- `UNIQUE(reactions.article_id, reactions.user_id)`.
- No permitir `advertisement_impressions` sobre artículos premium.
- No permitir reacción/comentario anónimo.
- No exponer `articles.body` completo si el artículo es premium y el usuario no tiene acceso.

---

## 10. Roadmap backend recomendado

### Fase 1 — Base editorial

- Auth.
- Roles.
- Usuarios internos.
- CMS artículos.
- Categorías.
- Tags.
- Multimedia.
- Publicación/despublicación.
- Outbox básico.

### Fase 2 — Portal lector y premium

- Registro de lectores.
- Login lector.
- Planes.
- Suscripciones.
- Pagos.
- Paywall.
- Control de acceso premium.

### Fase 3 — Interacciones y moderación

- Comentarios.
- Reacciones.
- Moderación.
- Anti-spam.
- Rate limiting.

### Fase 4 — Event-driven completo

- Event bus.
- Outbox dispatcher.
- Inbox idempotente.
- Workers de notificación.
- Workers de cache.
- Workers de búsqueda.
- Workers de analítica.
- Workers de publicidad.

### Fase 5 — Reportes y escala

- Métricas editoriales.
- Métricas de suscripción.
- Métricas de interacción.
- Métricas de publicidad.
- Observabilidad completa.

---

## 11. Resumen ejecutivo

El sistema debe construirse como una plataforma editorial digital event-driven. La publicación de contenido debe ser segura, auditada, desacoplada e idempotente. La regla de negocio más importante es que el contenido público es accesible para todos y puede mostrar publicidad discreta; el contenido premium exige suscripción activa y se muestra sin publicidad.
