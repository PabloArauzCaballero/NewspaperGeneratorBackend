# Registros batch de escrituras transaccionales

## Objetivo

El backend debe evitar que un endpoint inserte datos fragmentados en varias tablas sin dejar trazabilidad de que pertenecen a una misma operación lógica. Para eso se incorporó una capa de **batch write observability** en base de datos.

Esto no reemplaza las transacciones del código. Las complementa:

- la transacción garantiza atomicidad;
- los registros batch garantizan trazabilidad;
- el smoke DB valida que existan ambos niveles.

## Tablas nuevas

### `api_write_batches`

Representa una operación de escritura agrupada por `txid_current()` de PostgreSQL.

Campos principales:

- `id`: identificador del lote.
- `transaction_id`: identificador transaccional de PostgreSQL.
- `batch_source`: origen del registro. Por defecto `database_trigger`.
- `batch_type`: tipo de lote. Por defecto `implicit_transaction`.
- `status`: estado del lote.
- `affected_tables`: lista JSONB de tablas afectadas.
- `item_count`: cantidad de filas registradas dentro del lote.
- `started_at` / `finished_at`: ventana temporal detectada.
- `metadata`: metadatos de diagnóstico.

### `api_write_batch_items`

Representa cada fila afectada dentro del lote.

Campos principales:

- `batch_id`: lote padre.
- `transaction_id`: misma transacción PostgreSQL.
- `table_name`: tabla afectada.
- `action`: `INSERT`, `UPDATE` o `DELETE`.
- `record_id`: identificador de la fila afectada cuando existe.
- `ordinal`: orden de escritura dentro del lote.
- `metadata`: datos del trigger que capturó el cambio.

## Cómo se registran

La migración `20260627000700-create-api-write-batches.js` instala dos funciones:

- `ensure_api_write_batch()`
- `record_api_write_batch_item()`

Luego instala triggers sobre tablas de negocio críticas, por ejemplo:

- `users`
- `user_roles`
- `subscriptions`
- `payment_transactions`
- `articles`
- `comments`
- `advertisements`
- `event_outbox`
- `audit_logs`
- `user_refresh_tokens`
- `auth_login_attempts`
- `worker_runs`
- `database_backup_runs`

Si un endpoint escribe varias tablas dentro de una misma transacción, todas esas filas quedan bajo el mismo `api_write_batches.id`.

## Qué valida el smoke

`yarn test:smoke:db` valida:

- existe `api_write_batches`;
- existe `api_write_batch_items`;
- existe al menos un batch persistido;
- existe al menos un item persistido;
- existe al menos un batch con varios items, lo cual prueba agrupación multi-tabla.

## Endpoint administrativo

Se agregó:

```http
GET /api/v1/admin/audit/write-batches
Authorization: Bearer <adminToken>
```

Sirve para revisar los últimos lotes y sus items desde Postman o desde el futuro panel admin.

## Regla de calidad

Un endpoint que escribe datos en más de una tabla debe cumplir:

1. validar el payload completo antes de escribir;
2. validar que existan las entidades padre;
3. ejecutar todas las escrituras dentro de una transacción;
4. emitir outbox/audit dentro de la misma transacción;
5. dejar evidencia en `api_write_batches` y `api_write_batch_items`.

Si un cambio nuevo introduce varias escrituras sin transacción, se verá como lotes separados. Eso debe tratarse como deuda técnica o error de diseño.
