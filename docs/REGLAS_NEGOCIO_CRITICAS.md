# Reglas de negocio críticas — Periódico Digital Premium

## Acceso a contenido

1. Un visitante no logueado puede leer noticias públicas.
2. Un visitante no logueado no puede comentar ni reaccionar.
3. Un usuario registrado puede leer noticias públicas, comentar y reaccionar en contenido público.
4. Un usuario registrado sin suscripción activa no puede leer notas premium completas.
5. Un usuario premium es un usuario registrado con suscripción activa, no un rol fijo.
6. Una nota premium requiere login y suscripción activa.
7. Una nota premium puede mostrar título, portada y extracto controlado a usuarios sin acceso, pero nunca el cuerpo completo.
8. El backend nunca debe entregar contenido premium completo a clientes no autorizados.

## Publicidad

1. La publicidad solo aplica a contenido público.
2. Las notas premium deben mostrarse con cero publicidad.
3. No se deben crear impresiones publicitarias para artículos premium.
4. No se deben renderizar ad slots en páginas premium.
5. La publicidad no puede ser popup.
6. La publicidad no puede tapar contenido.
7. La publicidad no puede interrumpir la lectura.
8. La publicidad no puede reproducir sonido automáticamente.
9. La publicidad debe ser pequeña, discreta y coherente con un periódico reputado.

## Comentarios y reacciones

1. Para comentar siempre se requiere usuario logueado.
2. Para reaccionar siempre se requiere usuario logueado.
3. En artículos premium, además de login, se requiere suscripción activa para comentar o reaccionar.
4. Debe existir una única reacción por usuario y artículo.
5. Los comentarios deben poder pasar por moderación.
6. El sistema debe aplicar reglas anti-spam y rate limiting.

## Event-driven

1. La publicación de una noticia debe registrar un evento en `event_outbox` dentro de la misma transacción de base de datos.
2. Los workers publican y consumen eventos de forma asíncrona.
3. La noticia debe quedar publicada aunque fallen notificaciones, cache, indexación, analítica o publicidad.
4. Todo consumidor debe ser idempotente usando `event_inbox`.
5. Todo evento crítico debe tener `eventId`, `eventType`, `aggregateId`, `aggregateType`, `payload`, `correlationId`, `causationId` y `occurredAt`.
6. Para noticias públicas se emite `PublicArticlePublished`.
7. Para noticias premium se emite `PremiumArticlePublished`.
8. Si la noticia es pública, se notifica a usuarios registrados activos, premium o no.
9. Si la noticia es premium, se notifica solo a usuarios con suscripción activa.
10. Si la noticia es premium, se emite o registra internamente la regla `PremiumAdSlotsDisabled`.
