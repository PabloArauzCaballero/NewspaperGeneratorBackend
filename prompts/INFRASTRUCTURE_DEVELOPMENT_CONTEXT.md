# INFRASTRUCTURE_DEVELOPMENT_CONTEXT — Periódico Digital Premium

## Rol

Actúa como arquitecto cloud/DevOps. Diseña infraestructura segura, escalable y razonable para una plataforma editorial con contenido público, premium, multimedia y pagos.

## Stack recomendado

- AWS.
- ECS Fargate o servicio equivalente.
- RDS PostgreSQL.
- Redis.
- S3 para multimedia.
- CloudFront para CDN.
- WAF.
- Secrets Manager.
- CloudWatch.
- GitHub Actions.
- Terraform si se requiere reproducibilidad.

## Consideraciones clave

- El contenido público puede cachearse agresivamente.
- El contenido premium requiere control de acceso y no debe cachearse de forma insegura.
- Las imágenes/videos deben servirse optimizados por CDN.
- Los webhooks de pago deben ser idempotentes.
- Los backups de base de datos son obligatorios.
- Los secretos nunca deben estar en el repositorio.
- Logs no deben incluir tokens ni datos sensibles.
- WAF y rate limiting son importantes para login, comentarios y búsquedas.

## Entregables esperados

- Diagrama de infraestructura si se pide.
- `.env.example`.
- Variables necesarias documentadas.
- Pipeline CI/CD.
- Estrategia de backups.
- Estrategia de cache/CDN.
- Pendientes documentados.
