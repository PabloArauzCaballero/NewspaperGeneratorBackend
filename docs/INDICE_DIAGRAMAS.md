# Índice de diagramas

## 01_use_case_event_driven.puml
Casos de uso generales: CMS editorial, premium, publicidad discreta, comentarios, reacciones y eventos.

## 02_activity_journalist_publish_article_event_driven.puml
Actividad del periodista/editor desde login hasta publicación de una noticia y disparo de eventos. Incluye notificaciones diferenciadas por tipo de acceso.

## 03_activity_premium_user_subscription_article_access.puml
Actividad del usuario que crea cuenta, elige plan, paga suscripción y accede a noticia pública y premium.

## 04_class_diagram_event_driven.puml
Diagrama de clases actualizado con eventos, outbox, inbox, notificaciones, suscripciones, artículos, publicidad e interacción.

## 05_relational_er_event_driven.puml
Modelo relacional actualizado para PostgreSQL, incluyendo tablas event-driven.

## 06_sequence_article_publication_notifications.puml
Secuencia backend para publicar una noticia, crear outbox, despachar evento, resolver audiencia y enviar notificaciones.

## 07_sequence_user_subscription_and_access.puml
Secuencia backend para registro, pago de plan, activación de suscripción y acceso a noticia pública/premium.

## 08_state_article.puml
Estados de una noticia desde borrador hasta publicación, despublicación y archivo.

## 09_state_user_subscription.puml
Estados de usuario y suscripción desde visitante hasta premium activo, vencido, cancelado o bloqueado.

## 10_component_backend_only.puml
Diagrama de componentes SOLO BACKEND: módulos NestJS, workers, base de datos, cache, eventos, storage, pagos y observabilidad.

## 11_deployment_backend.puml
Diagrama de despliegue backend en infraestructura cloud recomendada.
