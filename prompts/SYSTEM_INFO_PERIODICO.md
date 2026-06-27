# SYSTEM INFO — Proyecto Periódico Digital Premium

**Versión:** 1.0  
**Fecha:** 2026-06-27  
**Documento:** Contexto integral de negocio, producto, operación editorial, experiencia de lectura, suscripciones, publicidad y reglas funcionales del sistema.  
**Uso recomendado:** Documento base para prompts, arquitectura, diseño de módulos, definición de APIs, priorización de roadmap, modelado de base de datos, UX/UI, seguridad, analítica, SEO, moderación y operación editorial.

---

## 1. Identidad del producto

El proyecto consiste en un **sistema generador y gestor de artículos web para un periódico digital de alta reputación**. El sistema debe permitir que periodistas y editores creen, editen, organicen, publiquen y mantengan artículos, noticias, columnas y notas especiales con contenido multimedia, respetando estándares profesionales de una marca periodística seria.

El sistema no debe entenderse como un simple CRUD de noticias. Debe entenderse como una **plataforma editorial digital** que cubre:

1. Creación y edición de artículos.
2. Flujo editorial de revisión y publicación.
3. Organización por categorías y tags.
4. Gestión de contenido multimedia.
5. Transcripción de audio asociada a notas.
6. Experiencia de lectura pública.
7. Acceso premium por suscripción a notas especiales.
8. Comentarios y reacciones solo para usuarios autenticados.
9. Moderación de participación de lectores.
10. Publicidad discreta, no invasiva y compatible con la reputación del periódico.
11. Analítica, SEO, rendimiento, auditoría y seguridad.

La idea central del sistema es:

> El periódico publica contenido confiable y profesional; los lectores consumen noticias públicas; los usuarios registrados pueden comentar y reaccionar; los usuarios con suscripción activa acceden a notas especiales premium; y la plataforma monetiza con suscripciones y publicidad discreta sin degradar la calidad editorial ni la legibilidad.

---

## 2. Modelo de negocio base

### 2.1. Qué ofrece el periódico

El periódico ofrece contenido informativo, columnas, análisis y notas especiales en formato web. El valor principal está en la calidad editorial, la reputación institucional, la experiencia de lectura y la confianza del lector.

El sistema debe proteger esa reputación evitando:

- Publicidad invasiva.
- Popups molestos.
- Interrupciones de lectura.
- Comentarios sin control.
- Contenido multimedia mal optimizado.
- Exposición indebida de contenido premium.
- Experiencia visual saturada o de baja calidad.

### 2.2. Fuentes de monetización

El sistema contempla dos fuentes principales de monetización:

1. **Suscripciones premium:** usuarios que pagan para acceder a contenido de notas especiales.
2. **Publicidad discreta:** anuncios pequeños, controlados y ubicados en espacios que no afecten la lectura.

### 2.3. Regla crítica de reputación

La publicidad debe ser secundaria respecto al contenido. En este proyecto, la calidad editorial y la legibilidad son más importantes que maximizar agresivamente impresiones publicitarias.

Por eso, la publicidad:

- No debe ser popup.
- No debe tapar el artículo.
- No debe interrumpir la lectura.
- No debe reproducir sonido automáticamente.
- No debe parecer clickbait.
- No debe romper la estética del periódico.
- Debe ser pequeña, discreta y controlada.

---

## 3. Producto editorial inicial

### 3.1. Artículo web base

Todo artículo debe permitir, como mínimo, los siguientes campos:

1. **Título principal.**
2. **Categoría de la noticia.**
3. **Lista de tags.**
4. **Cuerpo principal o columna.**
5. **Transcripción de audio de la nota.**
6. **Lista de imágenes.**
7. **Lista de videos.**
8. **Estado editorial.**
9. **Tipo de acceso:** público o premium.

Campos recomendados, sin reemplazar los requerimientos base:

- Slug SEO.
- Bajada o resumen breve.
- Imagen principal.
- Autor o autores.
- Fecha de publicación.
- Fecha de actualización.
- Tiempo estimado de lectura.
- Fuente o referencias internas.
- Estado de comentarios habilitado/deshabilitado.
- Metadatos SEO y redes sociales.

### 3.2. Contenido público

El contenido público puede ser leído por:

- Usuarios visitantes no logueados.
- Usuarios registrados.
- Usuarios premium.

Sin embargo, para **comentar o reaccionar**, el lector siempre debe estar logueado.

### 3.3. Contenido premium o notas especiales

Las notas especiales son contenido restringido. Solo pueden ser leídas completas por usuarios registrados con **suscripción activa**.

Regla fundamental:

> Premium no debe modelarse únicamente como un rol fijo. Debe modelarse como una condición de suscripción activa asociada a un usuario registrado.

Esto permite manejar:

- Suscripción vigente.
- Suscripción vencida.
- Renovación.
- Cancelación.
- Periodo de gracia si el negocio lo define.
- Cambio de plan.
- Historial de pagos.

Usuarios visitantes o usuarios registrados sin suscripción pueden ver una vista previa controlada, pero no el contenido completo.

---

## 4. Qué debe ser el sistema

El sistema debe ser una plataforma editorial de varias capas:

1. **CMS editorial:** creación, edición, borradores, revisión, publicación, despublicación, categorías, tags, multimedia y transcripciones.
2. **Portal público web:** lectura de noticias públicas, búsqueda, filtrado, detalle de artículo, experiencia responsive, SEO, accesibilidad y rendimiento.
3. **Paywall / suscripciones:** control de acceso a notas premium, planes, pagos, vencimientos, renovaciones y bloqueo elegante.
4. **Interacción del lector:** comentarios y reacciones solo para usuarios autenticados.
5. **Moderación:** revisión, aprobación, ocultamiento, eliminación y control de abuso en comentarios.
6. **Publicidad discreta:** gestión y visualización de espacios publicitarios no invasivos.
7. **Panel administrativo:** roles, permisos, usuarios, periodistas, editores, suscriptores, publicidad, categorías, reportes y auditoría.
8. **Backend central:** APIs, seguridad, reglas de acceso, persistencia, validaciones, caché, media storage, auditoría y tareas asíncronas.
9. **Analítica y reporting:** lectura, engagement, suscripciones, conversión premium, comentarios, reacciones, rendimiento de publicidad y rendimiento editorial.
10. **Seguridad y cumplimiento:** autenticación, autorización, protección de datos, trazabilidad de acciones y protección del contenido premium.

---

## 5. Qué se espera que haga el sistema

### 5.1. En el periodista

El sistema debe permitir que un periodista:

- Inicie sesión en el panel editorial.
- Cree artículos.
- Edite artículos propios o asignados.
- Complete título, categoría, tags, cuerpo, transcripción, imágenes y videos.
- Guarde borradores.
- Solicite revisión editorial si el flujo lo requiere.
- Marque o proponga una nota como pública o premium según permisos.
- Visualice vista previa antes de publicación.
- Corrija contenido sin perder versiones importantes.
- Consulte el estado editorial de sus artículos.

### 5.2. En el editor

El sistema debe permitir que un editor:

- Revise artículos creados por periodistas.
- Editar contenido editorialmente.
- Aprobar o rechazar publicación.
- Publicar artículos.
- Despublicar artículos.
- Cambiar estado editorial.
- Definir si una nota será pública o premium, si tiene permisos.
- Supervisar calidad de tags y categorías.
- Moderar comentarios.
- Corregir errores posteriores a publicación.
- Mantener trazabilidad de cambios editoriales.

### 5.3. En el administrador

El sistema debe permitir que un administrador:

- Gestionar usuarios internos.
- Gestionar roles y permisos.
- Gestionar usuarios lectores.
- Gestionar suscriptores.
- Administrar planes premium.
- Configurar categorías.
- Configurar políticas de comentarios.
- Configurar espacios publicitarios.
- Revisar auditoría.
- Ver reportes generales.
- Controlar parámetros críticos del sistema.

### 5.4. En el lector visitante

El sistema debe permitir que un visitante:

- Leer noticias públicas.
- Buscar noticias públicas.
- Filtrar por categorías y tags.
- Ver vista previa de notas premium.
- Registrarse.
- Iniciar sesión.
- Ver llamada elegante a suscribirse en contenido premium.

El visitante no puede:

- Comentar.
- Reaccionar.
- Leer contenido premium completo.

### 5.5. En el usuario registrado no suscrito

El sistema debe permitir que un usuario registrado:

- Leer noticias públicas.
- Comentar noticias públicas, si los comentarios están habilitados.
- Reaccionar a noticias públicas.
- Gestionar su perfil.
- Suscribirse a un plan premium.
- Ver vista previa de notas especiales.

El usuario registrado no suscrito no puede leer notas premium completas.

### 5.6. En el usuario premium

El sistema debe permitir que un usuario premium:

- Leer noticias públicas.
- Leer notas especiales premium completas.
- Comentar y reaccionar en contenido público.
- Comentar y reaccionar en contenido premium, si la sección está habilitada.
- Gestionar su suscripción.
- Renovar o cancelar su suscripción.
- Consultar estado de plan y vigencia.

### 5.7. En publicidad

El sistema debe permitir que el equipo comercial:

- Crear anuncios discretos.
- Definir ubicación permitida.
- Definir fecha de inicio y fin.
- Activar o pausar anuncios.
- Asociar anuncios a secciones o categorías, si se define.
- Validar formato y tamaño.
- Impedir anuncios invasivos.
- Medir impresiones y clics básicos, si se requiere.

---

## 6. Actores del sistema

### 6.1. Usuario visitante

Persona que entra al periódico sin iniciar sesión.

Necesidades:

- Lectura rápida.
- Navegación clara.
- Sitio confiable.
- No ser interrumpido por publicidad invasiva.
- Poder registrarse o suscribirse fácilmente.

Restricciones:

- No comenta.
- No reacciona.
- No lee premium completo.

### 6.2. Usuario registrado

Lector con cuenta activa, pero sin suscripción premium vigente.

Necesidades:

- Participar con comentarios y reacciones.
- Guardar preferencias básicas si el producto lo define.
- Suscribirse fácilmente.

Restricciones:

- No accede a notas premium completas.

### 6.3. Usuario premium / suscriptor

Usuario registrado con suscripción activa.

Necesidades:

- Acceso completo a notas especiales.
- Experiencia de lectura cuidada.
- Gestión clara de su suscripción.
- Transparencia sobre vencimiento, renovación y cancelación.

Riesgos asociados:

- Acceso premium vencido no bloqueado.
- Doble cobro.
- Fallos de pago.
- Exposición indebida de contenido exclusivo.

### 6.4. Periodista

Usuario interno encargado de crear contenido.

Necesidades:

- Editor de texto estable.
- Carga multimedia ordenada.
- Guardado seguro.
- Vista previa real.
- Clasificación rápida.
- Flujo editorial claro.

Riesgos asociados:

- Publicar por accidente.
- Pérdida de contenido redactado.
- Archivos multimedia pesados.
- Errores de categoría o tags.

### 6.5. Editor

Usuario interno responsable de revisión y publicación.

Necesidades:

- Control de calidad.
- Revisión de cambios.
- Publicación/despublicación.
- Moderación.
- Auditoría.

Riesgos asociados:

- Cambios no trazados.
- Publicación de contenido incorrecto.
- Falta de control en comentarios.

### 6.6. Administrador

Usuario interno con permisos amplios de configuración.

Necesidades:

- Gestión de roles.
- Gestión de usuarios.
- Configuración del sistema.
- Auditoría.
- Reportes.

Riesgos asociados:

- Acceso excesivo sin control.
- Cambios críticos sin trazabilidad.
- Configuración incorrecta de paywall o publicidad.

### 6.7. Editor comercial / administrador de publicidad

Usuario encargado de espacios publicitarios.

Necesidades:

- Crear anuncios.
- Ubicarlos de forma permitida.
- Activar/desactivar campañas.
- Medir rendimiento básico.

Restricciones:

- No debe modificar contenido editorial salvo permiso explícito.
- No debe crear publicidad invasiva.

### 6.8. Proveedor de pagos

Servicio externo encargado de procesar pagos de suscripciones.

Necesidades:

- Integración segura.
- Confirmación de pagos.
- Manejo de fallos.
- Webhooks confiables.
- Idempotencia.

Riesgos asociados:

- Pago aprobado pero suscripción no activada.
- Pago duplicado.
- Webhook no recibido.
- Cancelación no sincronizada.

### 6.9. Proveedor de almacenamiento/CDN

Servicio para almacenar y servir imágenes/videos.

Necesidades:

- Archivos optimizados.
- Entrega rápida.
- Seguridad.
- URLs controladas.
- Versionamiento o reemplazo seguro.

Riesgos asociados:

- Videos demasiado pesados.
- Imágenes sin optimizar.
- Costos altos.
- Archivos rotos en artículos publicados.

---

## 7. Módulos funcionales esperados

### 7.1. Infraestructura y DevOps

Debe cubrir:

- Ambientes separados: local, dev, staging y producción.
- CI/CD.
- Logs centralizados.
- Monitoreo.
- Alertas.
- Backups.
- Gestión de secretos.
- Migraciones controladas.
- Infraestructura reproducible.
- CDN para contenido estático y multimedia.
- Protección WAF/rate limiting para endpoints públicos.

### 7.2. Base de datos y modelo de datos

Debe cubrir:

- Usuarios.
- Roles.
- Permisos.
- Perfiles de lector.
- Suscripciones.
- Planes premium.
- Pagos de suscripción.
- Artículos.
- Versiones de artículos.
- Categorías.
- Tags.
- Relación artículo-tag.
- Multimedia.
- Transcripciones.
- Comentarios.
- Reacciones.
- Moderación.
- Publicidad.
- Ubicaciones publicitarias.
- Métricas básicas.
- Auditoría.

### 7.3. Autenticación y autorización

Debe cubrir:

- Registro de usuario lector.
- Login.
- Recuperación de contraseña.
- JWT o sesiones seguras según arquitectura definida.
- RBAC para usuarios internos.
- Control de permisos por acción.
- Control de acceso premium por suscripción activa.
- Rate limiting en login, registro, comentarios y reacciones.

### 7.4. CMS editorial

Debe cubrir:

- Crear artículo.
- Editar artículo.
- Guardar borrador.
- Vista previa.
- Publicar.
- Despublicar.
- Archivar.
- Gestionar categorías y tags.
- Gestionar transcripción.
- Gestionar imágenes y videos.
- Historial de cambios.
- Estados editoriales.

### 7.5. Estados editoriales

Estados sugeridos para artículos:

- `draft`
- `in_review`
- `changes_requested`
- `approved`
- `scheduled`
- `published`
- `unpublished`
- `archived`

Estados sugeridos para contenido premium:

- `public`
- `premium`
- `internal_only`

### 7.6. Gestión multimedia

Debe cubrir:

- Subida de imágenes.
- Subida o enlace de videos.
- Validación de tamaño.
- Validación de formato.
- Definición de imagen principal.
- Orden de galería.
- Texto alternativo para accesibilidad.
- Créditos o fuente de imagen si aplica.
- Optimización de imágenes.
- Prevención de archivos peligrosos.

### 7.7. Transcripción de audio

Debe cubrir:

- Campo de transcripción textual.
- Edición manual.
- Guardado asociado al artículo.
- Visualización si el artículo lo requiere.
- Posible integración futura con transcripción automática.

La IA no debe asumir un proveedor de transcripción automática si el cliente no lo definió.

### 7.8. Paywall y suscripciones

Debe cubrir:

- Planes premium.
- Suscripciones activas.
- Vencimientos.
- Renovaciones.
- Cancelaciones.
- Pagos.
- Webhooks.
- Periodos de gracia si el negocio los define.
- Vista previa de contenido premium.
- Bloqueo de contenido completo para no suscriptores.
- Auditoría de cambios de suscripción.

### 7.9. Comentarios

Debe cubrir:

- Comentar solo con login.
- Validación de contenido.
- Moderación.
- Estados de comentario.
- Reportes de abuso si aplica.
- Ocultamiento/eliminación lógica.
- Historial básico.
- Control anti-spam.

Estados sugeridos de comentarios:

- `pending_review`
- `published`
- `hidden`
- `rejected`
- `deleted_by_user`
- `deleted_by_moderator`

### 7.10. Reacciones

Debe cubrir:

- Reaccionar solo con login.
- Evitar duplicidad por usuario y artículo.
- Permitir cambiar reacción si se define.
- Contadores por artículo.
- Métricas básicas.

La lista final de reacciones debe ser definida por negocio. No inventar reacciones definitivas si el cliente no las aprobó.

### 7.11. Publicidad discreta

Debe cubrir:

- Gestión de anuncios.
- Ubicaciones permitidas.
- Validación de dimensiones.
- Validación de peso.
- Fechas de campaña.
- Enlace de destino.
- Activación/pausa.
- Métricas básicas.
- Reglas anti-invasivas.

Ubicaciones recomendadas:

- Lateral discreto en desktop.
- Bloque pequeño entre secciones, con baja frecuencia.
- Banner inferior no flotante.
- Espacio al final de la nota.

Ubicaciones prohibidas salvo decisión explícita del cliente:

- Popup.
- Interstitial de bloqueo.
- Anuncio encima del texto.
- Anuncio con autoplay sonoro.
- Overlay que tape contenido.
- Banner flotante persistente que reduzca legibilidad.

### 7.12. Portal público web

Debe cubrir:

- Portada.
- Listado por categorías.
- Buscador.
- Detalle de artículo.
- Detalle de nota premium.
- Vista previa premium.
- Comentarios.
- Reacciones.
- Registro/login.
- Suscripción.
- Perfil del usuario.
- Responsive design.
- Accesibilidad.
- SEO técnico.
- Performance.

### 7.13. Panel administrativo

Debe cubrir:

- Dashboard.
- Gestión de artículos.
- Gestión de usuarios internos.
- Gestión de lectores.
- Gestión de suscripciones.
- Gestión de planes.
- Gestión de comentarios.
- Gestión de publicidad.
- Gestión de categorías y tags.
- Auditoría.
- Reportes.

### 7.14. Analítica y reportes

Debe cubrir:

- Artículos publicados.
- Lecturas por artículo.
- Lecturas por categoría.
- Conversión a suscripción.
- Usuarios registrados.
- Suscriptores activos.
- Suscripciones vencidas.
- Comentarios por artículo.
- Reacciones por artículo.
- Comentarios moderados.
- Rendimiento de publicidad.
- Rendimiento del paywall.
- Errores de carga multimedia.

---

## 8. Reglas de negocio no negociables

1. Para comentar, el usuario debe estar logueado.
2. Para reaccionar, el usuario debe estar logueado.
3. Los usuarios visitantes pueden leer solo contenido público.
4. Los usuarios registrados sin suscripción pueden leer contenido público, comentar y reaccionar en contenido público.
5. Los usuarios registrados sin suscripción no pueden leer notas premium completas.
6. Los usuarios premium pueden leer contenido público y premium mientras su suscripción esté activa.
7. Premium debe depender del estado de suscripción activa, no solo de un rol estático.
8. El contenido premium no debe exponerse completo en listados, búsquedas, respuestas API públicas, metadatos o previsualizaciones.
9. La publicidad no debe ser popup.
10. La publicidad no debe tapar contenido.
11. La publicidad no debe interrumpir la lectura.
12. La publicidad debe ser pequeña, discreta y coherente con la reputación del periódico.
13. Las acciones editoriales críticas deben quedar auditadas.
14. Los comentarios deben poder moderarse.
15. La publicación y despublicación deben tener permisos claros.

---

## 9. Seguridad y privacidad

El sistema debe contemplar:

- Contraseñas hasheadas.
- JWT o sesiones seguras.
- Refresh tokens si aplica.
- Protección CSRF si se usan cookies.
- Rate limiting.
- Validación estricta de inputs.
- Sanitización de HTML en artículos y comentarios.
- Protección XSS.
- Protección contra subida de archivos maliciosos.
- Control de acceso en APIs.
- Auditoría de acciones internas.
- No exponer contenido premium en respuestas públicas.
- No registrar tokens, contraseñas ni datos sensibles en logs.
- Políticas de retención de datos.

---

## 10. SEO, accesibilidad y rendimiento

### 10.1. SEO

Debe contemplar:

- Slugs amigables.
- Metatítulos.
- Metadescripciones.
- Open Graph.
- Sitemap.
- Robots.txt.
- Datos estructurados para artículos.
- URLs canónicas.
- Control de indexación de contenido premium.

### 10.2. Accesibilidad

Debe contemplar:

- Texto alternativo en imágenes.
- Contraste suficiente.
- Navegación por teclado.
- Semántica HTML correcta.
- Tamaños de fuente legibles.
- No depender solo del color para comunicar estados.

### 10.3. Rendimiento

Debe contemplar:

- CDN.
- Optimización de imágenes.
- Lazy loading.
- Caché para noticias públicas.
- Invalidación de caché al publicar/despublicar.
- SSR/ISR si se usa Next.js.
- Separación clara entre contenido público cacheable y contenido premium protegido.

---

## 11. Estados críticos que el sistema debe modelar

### 11.1. Usuario lector

Estados sugeridos:

- `pending_email_verification`
- `active`
- `suspended`
- `blocked`
- `deleted`

### 11.2. Suscripción

Estados sugeridos:

- `trialing`
- `active`
- `past_due`
- `cancelled`
- `expired`
- `payment_failed`

### 11.3. Artículo

Estados sugeridos:

- `draft`
- `in_review`
- `changes_requested`
- `approved`
- `scheduled`
- `published`
- `unpublished`
- `archived`

### 11.4. Comentario

Estados sugeridos:

- `pending_review`
- `published`
- `hidden`
- `rejected`
- `deleted_by_user`
- `deleted_by_moderator`

### 11.5. Publicidad

Estados sugeridos:

- `draft`
- `scheduled`
- `active`
- `paused`
- `expired`
- `rejected`

### 11.6. Pago de suscripción

Estados sugeridos:

- `pending`
- `paid`
- `failed`
- `refunded`
- `cancelled`
- `disputed`

---

## 12. Reglas de negocio pendientes que deben cerrarse

Antes de implementar producción, deben definirse estas políticas:

1. Nombre oficial del proyecto/periódico.
2. País y marco legal específico aplicable.
3. Proveedor de pagos para suscripciones.
4. Planes, precios, duración y moneda.
5. Política de renovación automática.
6. Política de cancelación y reembolso.
7. Si existirá periodo de prueba premium.
8. Qué porcentaje o cantidad de texto se muestra como vista previa premium.
9. Si las notas premium aparecerán en buscadores públicos.
10. Lista final de categorías.
11. Política de creación automática de tags.
12. Roles internos exactos.
13. Flujo editorial: si periodista puede publicar o solo editor.
14. Política de versiones de artículos.
15. Política de comentarios: moderación previa o posterior.
16. Lista final de reacciones disponibles.
17. Reglas anti-spam y límites de comentarios.
18. Tamaños máximos de imágenes.
19. Tamaños máximos de videos.
20. Si los videos se subirán al sistema o se enlazarán desde plataformas externas.
21. Política de derechos de autor y créditos de imágenes.
22. Ubicaciones publicitarias exactas.
23. Dimensiones máximas y peso máximo de anuncios.
24. Confirmado: en notas premium el usuario no verá publicidad. La publicidad solo aplica a noticias públicas.
25. Métricas mínimas requeridas para reportes.
26. Política de retención de usuarios, comentarios y auditoría.

---

## 13. Qué NO debe hacer el sistema sin definición previa

El sistema no debe:

- Permitir comentar o reaccionar sin login.
- Exponer contenido premium completo a usuarios no suscritos.
- Tratar premium como un rol fijo sin validar suscripción activa.
- Publicar anuncios como popup.
- Insertar anuncios que tapen o rompan la lectura.
- Reproducir audio o video publicitario automáticamente.
- Permitir carga multimedia sin validación de formato y tamaño.
- Permitir HTML inseguro en artículos o comentarios.
- Permitir publicación/despublicación sin permisos.
- Permitir acciones editoriales críticas sin auditoría.
- Borrar definitivamente artículos publicados sin política de archivo.
- Borrar comentarios moderados sin trazabilidad si la política exige historial.
- Simular integración de pagos real sin proveedor definido.
- Hardcodear secretos, tokens, claves de pago o URLs privadas.
- Usar datos reales de lectores en seeds o pruebas.
- Dejar pendientes críticos solo en comentarios de código.

---

## 14. Criterios de diseño para desarrollo técnico

### 14.1. Arquitectura backend recomendada

El backend debe usar, salvo decisión explícita distinta:

- NestJS.
- TypeScript.
- Sequelize.
- PostgreSQL.
- Zod para validación.
- JWT para autenticación.
- Guards para permisos.
- Migraciones controladas.
- Separación entre controllers, services, repositories, schemas, DTOs y mappers.
- Módulos por dominio: auth, users, articles, categories, tags, media, subscriptions, payments, comments, reactions, ads, analytics, audit.

### 14.2. Frontend web recomendado

El frontend web debe usar, salvo decisión explícita distinta:

- Next.js 15 App Router.
- TypeScript strict.
- Tailwind CSS.
- shadcn/ui o componentes accesibles equivalentes.
- Diseño responsive.
- SSR/ISR donde aplique.
- Manejo cuidadoso de contenido premium.
- SEO técnico.
- UI limpia, elegante y propia de un periódico reputado.

### 14.3. Infraestructura recomendada

La infraestructura debe contemplar:

- AWS o proveedor equivalente.
- RDS PostgreSQL.
- Redis para caché/rate limit/colas ligeras si aplica.
- S3 para multimedia.
- CloudFront/CDN.
- WAF.
- Secrets Manager.
- Backups.
- CloudWatch/logs centralizados.
- GitHub Actions.
- Terraform si se requiere infraestructura reproducible.

### 14.4. Diseño de datos

La base debe diferenciar:

- Tablas operativas.
- Catálogos.
- Eventos/auditoría append-only.
- Versiones de artículos.
- Archivos multimedia.
- Suscripciones y pagos.
- Interacciones del lector.
- Configuraciones de publicidad.

### 14.5. Observabilidad

Debe contemplar:

- Logs estructurados.
- Correlation IDs.
- Métricas por módulo.
- Alertas de fallos críticos.
- Auditoría de acciones administrativas.
- Monitoreo de errores del frontend.
- Monitoreo de webhooks de pago.

---

## 15. Flujos principales esperados

### 15.1. Creación y publicación de artículo

1. Periodista inicia sesión.
2. Crea artículo.
3. Completa título, categoría, tags, cuerpo, transcripción, imágenes y videos.
4. Guarda borrador.
5. Envía a revisión si aplica.
6. Editor revisa.
7. Editor aprueba.
8. Editor publica o programa publicación.
9. Sistema invalida caché y muestra la noticia públicamente según tipo de acceso.

### 15.2. Lectura de noticia pública

1. Lector entra al sitio.
2. Busca o abre una noticia pública.
3. Sistema muestra contenido completo.
4. Sistema muestra publicidad discreta si existe.
5. Si el lector está logueado, puede comentar y reaccionar.
6. Si no está logueado, puede leer, pero se le solicita login para comentar o reaccionar.

### 15.3. Lectura de nota premium

1. Lector abre una nota premium.
2. Sistema verifica si está logueado.
3. Sistema valida suscripción activa.
4. Si cumple, muestra el contenido completo.
5. Si no cumple, muestra vista previa y mensaje elegante de suscripción.
6. El sistema no entrega el contenido premium completo al cliente si no tiene acceso.

### 15.4. Comentario

1. Usuario logueado abre una noticia.
2. Escribe comentario.
3. Sistema valida contenido.
4. Sistema aplica reglas anti-spam.
5. Comentario queda publicado o pendiente de moderación.
6. Editor puede moderarlo.

### 15.5. Reacción

1. Usuario logueado abre una noticia.
2. Selecciona reacción.
3. Sistema verifica que no exista duplicado del mismo usuario en la misma noticia.
4. Sistema registra o actualiza reacción.
5. Contadores se actualizan.

### 15.6. Suscripción premium

1. Usuario registrado entra a planes premium.
2. Selecciona plan.
3. Confirma pago.
4. Proveedor procesa pago.
5. Sistema recibe confirmación segura.
6. Sistema activa suscripción.
7. Usuario accede a notas especiales.

### 15.7. Gestión de publicidad discreta

1. Editor comercial crea anuncio.
2. Define ubicación permitida.
3. Carga imagen/texto/enlace.
4. Sistema valida tamaño, peso y comportamiento.
5. Administrador activa campaña.
6. Sistema muestra anuncio sin interrumpir lectura.

---

## 16. KPIs que el sistema debe poder medir

### 16.1. Editorial

- Artículos creados.
- Artículos publicados.
- Artículos por categoría.
- Tiempo promedio desde borrador hasta publicación.
- Artículos actualizados después de publicación.
- Autores más activos.

### 16.2. Lectura

- Vistas por artículo.
- Vistas por categoría.
- Tiempo de lectura estimado.
- Scroll depth si se implementa.
- Noticias más leídas.
- Búsquedas internas.

### 16.3. Suscripciones

- Usuarios registrados.
- Suscriptores activos.
- Suscripciones nuevas.
- Renovaciones.
- Cancelaciones.
- Pagos fallidos.
- Conversión de vista previa premium a suscripción.
- Churn.

### 16.4. Interacción

- Comentarios por artículo.
- Comentarios pendientes de moderación.
- Comentarios eliminados/ocultos.
- Reacciones por artículo.
- Usuarios más participativos.
- Reportes de abuso si aplica.

### 16.5. Publicidad

- Impresiones.
- Clics.
- CTR.
- Campañas activas.
- Rendimiento por ubicación.
- Impacto en velocidad de carga.

### 16.6. Operación técnica

- Tiempo de respuesta API.
- Errores 4xx/5xx.
- Fallos de carga multimedia.
- Fallos de webhooks de pago.
- Latencia de páginas principales.
- Cache hit ratio.

---

## 17. Roadmap funcional recomendado

### 17.1. MVP editorial mínimo

1. Autenticación.
2. Roles básicos: administrador, editor, periodista, lector.
3. CMS de artículos.
4. Categorías y tags.
5. Gestión básica de imágenes/videos.
6. Transcripción manual.
7. Publicación/despublicación.
8. Portal público de lectura.
9. Buscador básico.
10. Publicidad discreta básica.

### 17.2. MVP premium

1. Registro de lectores.
2. Login de lectores.
3. Planes de suscripción.
4. Integración con proveedor de pagos definido.
5. Activación de suscripción.
6. Paywall.
7. Vista previa premium.
8. Control de acceso premium.

### 17.3. MVP interacción

1. Comentarios solo con login.
2. Reacciones solo con login.
3. Moderación de comentarios.
4. Anti-spam básico.
5. Reportes básicos de interacción.

### 17.4. Crecimiento temprano

1. Versionado avanzado de artículos.
2. Programación de publicación.
3. SEO avanzado.
4. Analítica editorial.
5. Personalización de portada.
6. Newsletter.
7. Notificaciones.
8. Panel comercial de publicidad.

### 17.5. Escala

1. CDN avanzado.
2. Caché distribuida.
3. Motor de recomendación.
4. Segmentación de publicidad.
5. Apps móviles.
6. Integraciones con sistemas internos del periódico.
7. Data warehouse.

---

## 18. Preguntas estratégicas para dirección

Antes de construir producción completa, dirección debe responder:

1. ¿Cuál es el nombre oficial del periódico/proyecto?
2. ¿Quién puede publicar: periodista, editor o solo administrador/editor?
3. ¿Las notas premium tendrán vista previa? ¿Cuánto contenido se muestra?
4. Confirmado: las notas premium se muestran con cero publicidad. La publicidad solo aplica a noticias públicas.
5. ¿Qué proveedor de pagos se usará?
6. ¿Habrá renovación automática?
7. ¿Habrá reembolsos?
8. ¿Qué planes premium existirán?
9. ¿Qué categorías iniciales tendrá el periódico?
10. ¿Qué reacciones estarán permitidas?
11. ¿Los comentarios se publican inmediatamente o pasan por moderación?
12. ¿Qué contenido se considera prohibido en comentarios?
13. ¿Cuáles son los tamaños permitidos para imágenes y videos?
14. ¿Dónde se alojarán los videos?
15. ¿Qué ubicaciones exactas de publicidad aprueba la marca?
16. ¿Qué métricas son obligatorias para dirección?
17. ¿Qué política de retención de datos aplica?
18. ¿Qué integraciones internas existentes tiene el periódico?

---

## 19. Supuestos actuales

Este documento asume:

- El producto es un periódico digital web.
- Existen usuarios internos: periodista, editor, administrador y editor comercial.
- Existen lectores visitantes, lectores registrados y lectores premium.
- El contenido base puede ser público o premium.
- El contenido premium corresponde a notas especiales.
- Solo usuarios logueados pueden comentar y reaccionar.
- Usuarios no logueados pueden leer noticias públicas, pero no interactuar.
- Usuarios registrados sin suscripción no pueden leer notas premium completas.
- La publicidad debe ser discreta y nunca popup.
- El stack recomendado es NestJS + Next.js + PostgreSQL, salvo decisión distinta del cliente.
- El proveedor de pagos aún no está definido.
- El país/marco legal exacto debe confirmarse.

Si cualquiera de estos supuestos cambia, este documento debe actualizarse antes de seguir desarrollando módulos dependientes.

---

## 20. Fuentes internas del proyecto

- Requerimientos funcionales indicados por el cliente:
  - Campos base de artículo: título, tags, categoría, cuerpo, transcripción, imágenes y videos.
  - Periodista puede crear y editar artículos.
  - Usuario normal puede ver noticias públicas.
  - Usuario logueado puede reaccionar y comentar.
  - Usuario premium con suscripción activa accede a notas especiales.
  - Publicidad pequeña, discreta y no popup.
- Casos de uso básicos definidos para el proyecto.
- Diagrama PlantUML de casos de uso definido para el proyecto.
- `SYSTYEM_INFO.md` de referencia estructural usado como ejemplo.

---

## 21. Resumen ejecutivo final

El sistema debe construirse como una plataforma editorial digital seria, no como un CRUD básico de artículos. Su éxito depende de equilibrar cinco elementos:

1. Calidad editorial y flujo profesional de publicación.
2. Experiencia de lectura limpia, rápida y confiable.
3. Monetización premium mediante suscripciones bien controladas.
4. Publicidad discreta que no dañe la reputación del periódico.
5. Seguridad, auditoría, SEO, moderación y rendimiento desde el inicio.

La regla central del producto es clara: **el contenido público es accesible para todos, pero comentar y reaccionar exige login; el contenido premium exige suscripción activa; las notas premium no muestran publicidad; y la publicidad pública nunca debe interrumpir ni degradar la lectura.**
