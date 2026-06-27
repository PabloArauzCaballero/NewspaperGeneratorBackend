# Proyecto Periódico Digital Premium — Brief técnico-operativo para IA

## 1. Qué es el proyecto

Es una plataforma web editorial para un periódico digital de alta reputación. Permite crear, editar, publicar y visualizar artículos con texto, tags, categorías, transcripción de audio, imágenes y videos. Además incorpora suscripciones premium para notas especiales, comentarios y reacciones solo para usuarios autenticados, y publicidad discreta no invasiva.

## 2. Frentes del producto

### CMS editorial

- Crear artículos.
- Editar artículos.
- Guardar borradores.
- Gestionar categorías y tags.
- Gestionar multimedia.
- Agregar transcripción de audio.
- Definir acceso público o premium.
- Publicar/despublicar según permisos.

### Portal web público

- Portada.
- Listados por categoría.
- Búsqueda.
- Detalle de noticia pública.
- Detalle de nota premium con paywall.
- Registro/login.
- Comentarios y reacciones para usuarios logueados.
- Publicidad discreta.

### Suscripciones premium

- Planes.
- Pagos.
- Suscripción activa/vencida/cancelada.
- Bloqueo de notas especiales para no suscriptores.
- Vista previa elegante.

### Panel administrativo

- Gestión de usuarios y roles.
- Gestión de artículos.
- Gestión de comentarios.
- Gestión de suscripciones.
- Gestión de publicidad.
- Reportes y auditoría.

## 3. Reglas de negocio no negociables

1. Los usuarios no logueados pueden leer noticias públicas, pero no pueden comentar ni reaccionar.
2. Para comentar se debe estar logueado.
3. Para reaccionar se debe estar logueado.
4. Las notas premium solo pueden ser leídas completas por usuarios con suscripción activa.
5. Premium no debe depender solo de un rol fijo; debe validarse el estado de suscripción.
6. La publicidad debe ser pequeña y discreta.
7. La publicidad no debe ser popup.
8. La publicidad no debe tapar ni interrumpir el contenido.
9. El contenido premium no debe exponerse completo en APIs, listados, búsquedas, metadatos o vistas previas.
10. Las acciones editoriales críticas deben auditarse.

## 4. Stack recomendado

- Backend: NestJS + TypeScript + Sequelize + PostgreSQL + Zod + JWT.
- Web: Next.js 15 App Router + TypeScript strict + Tailwind + shadcn/ui/Radix.
- Infra: AWS + RDS PostgreSQL + Redis + S3 + CloudFront/WAF + Secrets Manager + CloudWatch + GitHub Actions.
- Arquitectura: monolito modular backend, frontend web separado, evolución a servicios separados solo con evidencia real de escala.

## 5. Módulos por prioridad

### MVP editorial

1. Auth y roles.
2. CMS de artículos.
3. Categorías y tags.
4. Multimedia.
5. Transcripción.
6. Publicación/despublicación.
7. Portal público.
8. Buscador básico.

### MVP interacción

1. Registro de lectores.
2. Comentarios con login.
3. Reacciones con login.
4. Moderación.
5. Anti-spam básico.

### MVP premium

1. Planes de suscripción.
2. Pagos con proveedor definido.
3. Webhooks.
4. Paywall.
5. Vista previa premium.
6. Validación de suscripción activa.

### MVP monetización publicitaria

1. Espacios publicitarios discretos.
2. Gestión de campañas.
3. Validación de dimensiones y peso.
4. Métricas básicas.

## 6. Decisiones que la IA no puede inventar

La IA no puede decidir sola:

- Nombre definitivo del proyecto/periódico.
- Proveedor de pagos.
- Precios y duración de planes.
- Política de renovación automática.
- Política de reembolso.
- Cantidad de contenido premium que se mostrará como vista previa.
- Lista final de categorías.
- Lista final de reacciones.
- Política exacta de moderación.
- Ubicaciones exactas de publicidad.
- Tamaños máximos definitivos de imágenes, videos y anuncios.
- Confirmado: las notas premium se muestran con cero publicidad; la publicidad solo aplica a noticias públicas.
- Política legal de privacidad y retención.

Si una de estas decisiones bloquea producción, debe quedar marcada como pendiente y no implementarse como regla definitiva.

## 7. Criterio de éxito técnico

Una entrega es aceptable solo si:

- Es segura.
- No expone contenido premium.
- Respeta permisos.
- No permite comentar/reaccionar sin login.
- Tiene migraciones si cambia base de datos.
- Tiene validaciones.
- Tiene manejo de errores.
- Documenta endpoints y estados.
- Registra pendientes en Markdown.
- Mantiene una UI profesional, limpia y legible.
