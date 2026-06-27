# Supuestos de arquitectura documentados

SUPUESTO_PERIODICO: el backend se mantiene como monolito modular NestJS, separado por dominios y preparado para extraer servicios solo cuando existan métricas reales de escala.

SUPUESTO_PERIODICO: el dispatcher de eventos se expone temporalmente por HTTP bajo `/admin/events/dispatch-pending` para facilitar pruebas locales. En producción debe moverse a worker administrado por cola o scheduler.

SUPUESTO_PERIODICO: los assets multimedia no se suben todavía a S3 desde el backend; se registran URLs, MIME type y tamaño para validar la estructura de CMS sin inventar proveedor/storage definitivo.

SUPUESTO_PERIODICO: el control de permisos granular queda modelado en base de datos, pero la autorización efectiva de esta fase usa guards por rol para mantener una implementación estable y auditable.

SUPUESTO_PERIODICO: el proveedor de pagos es `manual_demo`; los webhooks son idempotentes, pero falta conectar una pasarela real.

SUPUESTO_PERIODICO: la indexación de búsqueda guarda metadatos seguros y nunca guarda el cuerpo completo de artículos premium.

## Redis

- Redis se usa como cache de lecturas públicas y catálogos, no como fuente de verdad.
- Si Redis falla, el sistema debe continuar respondiendo desde PostgreSQL.
- Las respuestas premium autenticadas no se cachean para evitar fugas por error de keying.
- Las previews premium anónimas pueden cachearse porque no contienen cuerpo ni transcripción.

## Backup Neon

- `NEON_BACKUP_DATABASE_URL` debe apuntar a otro proyecto/base Neon, nunca a producción.
- El backup usa `pg_dump`/`pg_restore`; por tanto el host que ejecuta el job debe tener PostgreSQL client instalado.
- La tabla `database_backup_runs` es operacional, no de negocio editorial.
- En producción real conviene agregar alertas del workflow y retención externa de dumps si se necesita histórico mayor.
