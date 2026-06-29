# Job de backup a otro proyecto Neon DB

## Objetivo

Crear un respaldo completo de la base principal PostgreSQL y restaurarlo en **otro proyecto/base Neon** dedicado a backups o disaster recovery.

El job está implementado en:

```txt
scripts/backup-to-neon.ts
.github/workflows/neon-backup.yml
```

## Variables requeridas

```env
DATABASE_URL=postgres://usuario:password@host-principal/db_principal?sslmode=require
NEON_BACKUP_DATABASE_URL=postgres://usuario:password@host-backup/db_backup?sslmode=require
DATABASE_SSL=true
```

Variables opcionales:

```env
BACKUP_FILE_DIR=./backups
BACKUP_KEEP_LOCAL_FILES=false
NEON_BACKUP_DROP_TARGET_BEFORE_RESTORE=false
NEON_BACKUP_PG_DUMP_BIN=pg_dump
NEON_BACKUP_PG_RESTORE_BIN=pg_restore
NEON_BACKUP_PSQL_BIN=psql
```

## Seguridad aplicada

El script rechaza ejecutar el backup si detecta que `DATABASE_URL` y `NEON_BACKUP_DATABASE_URL` apuntan a la misma base/proyecto.

También usa:

- `pg_dump --format=custom`
- `pg_restore --clean --if-exists`
- `--no-owner`
- `--no-privileges`

Esto evita arrastrar ownership del ambiente origen hacia Neon backup.

## Ejecución local

Requiere tener `pg_dump`, `pg_restore` y `psql` instalados.

```bash
yarn backup:neon
```

## Ejecución desde GitHub Actions

Workflow:

```txt
.github/workflows/neon-backup.yml
```

Se ejecuta:

- Manualmente con `workflow_dispatch`.
- Diario a las `03:20 UTC`.

Secrets requeridos en GitHub:

```txt
DATABASE_URL
NEON_BACKUP_DATABASE_URL
```

## Auditoría del backup

La migración crea la tabla:

```txt
database_backup_runs
```

Campos principales:

- `status`: `started`, `succeeded`, `failed`.
- `dump_size_bytes`.
- `checksum_sha256`.
- `duration_ms`.
- `error_message`.

Consulta rápida:

```sql
SELECT status, dump_size_bytes, checksum_sha256, started_at, finished_at, error_message
FROM database_backup_runs
ORDER BY started_at DESC
LIMIT 20;
```

## Recomendación operativa

Para producción real, usa un proyecto Neon separado solo para backup. No mezcles staging, demo o producción con el target de restauración automática.

Antes de activar el cron diario:

1. Crear el proyecto backup en Neon.
2. Configurar `NEON_BACKUP_DATABASE_URL` como secret.
3. Ejecutar manualmente el workflow una vez.
4. Comparar conteos de tablas críticas.
5. Revisar `database_backup_runs`.
6. Activar alertas si el workflow falla.

## Restauración total sobre target limpio

Por defecto el script no elimina todo el schema antes de restaurar; usa `pg_restore --clean --if-exists`.

Si el target es una DB exclusiva de backup y quieres forzar limpieza total:

```env
NEON_BACKUP_DROP_TARGET_BEFORE_RESTORE=true
```

Solo usa esa opción si estás completamente seguro de que el target no contiene datos manuales que deban conservarse.
