# Integridad atómica de escritura por endpoint

Este documento deja explícita la regla aplicada al backend: **ningún endpoint debe crear datos fragmentados en varias tablas**. Si una operación de negocio necesita escribir en más de una tabla, todas esas escrituras deben estar dentro de una misma transacción de base de datos o deben ejecutarse como eventos outbox idempotentes.

## Principio rector

Una petición HTTP no debe dejar medias operaciones. Por ejemplo, registrar un usuario no debe crear primero `users` y después, en otra operación separada, crear `user_roles` o `user_refresh_tokens`. El registro completo debe quedar así:

1. validar payload completo con Zod;
2. validar dependencias necesarias, por ejemplo rol `reader`;
3. iniciar transacción;
4. insertar `users`;
5. insertar `user_roles`;
6. registrar intento de login/auditoría si corresponde;
7. insertar evento en `event_outbox`;
8. insertar `user_refresh_tokens` si el endpoint devuelve sesión;
9. confirmar transacción;
10. recién después devolver respuesta al cliente.

Si cualquiera de los pasos de base de datos falla, la operación completa se revierte.

## Cambios aplicados

### Auth / registro y login

Antes el registro creaba el usuario/rol y luego generaba el refresh token en una segunda transacción. Eso podía dejar un usuario creado sin sesión inicial si fallaba la creación del token.

Ahora `POST /auth/register` hace en una sola transacción:

- validación de email duplicado;
- validación del rol `reader`;
- creación en `users`;
- creación en `user_roles`;
- intento de login exitoso en `auth_login_attempts`;
- evento `UserRegistered` en `event_outbox`;
- refresh token inicial en `user_refresh_tokens`.

`POST /auth/login` también crea el refresh token en la misma transacción que limpia intentos fallidos, registra login exitoso y escribe el evento `UserLoggedIn`.

### Usuarios y roles

Los endpoints administrativos de usuario ahora escriben mutación + auditoría en una sola transacción:

- `PATCH /users/:id/status`
- `POST /users/:id/roles`
- `POST /users/:id/roles/remove`

Además, antes de registrar auditoría se valida que el usuario objetivo exista. Esto evita auditoría apuntando a entidades inexistentes.

### Suscripciones

Los endpoints de suscripción ahora mantienen consistencia entre `subscriptions`, `payment_transactions`, `audit_logs` y `event_outbox`:

- `POST /subscriptions/checkout`: crea suscripción pendiente + transacción de pago + evento outbox en una sola transacción.
- `POST /subscriptions/activate-manual`: valida usuario/plan, cancela suscripción activa anterior, crea nueva suscripción activa, audita y publica evento en una sola transacción.
- `POST /subscriptions/:id/cancel`: cancela suscripción, audita y publica evento en una sola transacción.

La invalidación Redis ocurre después del commit, porque Redis no participa en la transacción SQL.

### Publicidad

Los endpoints de publicidad ahora validan primero las filas padre antes de tocar tablas hijas:

- se valida `advertisement_placements` antes de crear/actualizar;
- se validan todas las `categories` antes de reemplazar `advertisement_category_targets`;
- se valida que la publicidad exista antes de cambiar targets, activar o pausar;
- mutación y auditoría quedan dentro de la misma transacción.

Esto evita borrar targets y luego fallar por una categoría inválida, o auditar una publicidad inexistente.

### Artículos

Los endpoints editoriales ya usaban transacciones, pero ahora sus lecturas de respuesta (`getAdmin`) se ejecutan dentro de la misma transacción. Esto evita respuestas inconsistentes o lecturas fuera del commit.

Además, el registro de invalidación de cache se asocia a la misma transacción SQL cuando corresponde. La eliminación real en Redis sigue siendo efecto externo y no se considera fuente de verdad transaccional.

### Comentarios

Al responder un comentario, ahora se valida que `parentCommentId` pertenezca al mismo artículo. Esto evita relacionar comentarios de artículos distintos.

### Analítica

`POST /analytics/articles/:id/view` ahora inserta `article_views` y el evento `ArticleViewed` en `event_outbox` dentro de una misma transacción.

### Seguridad

La revocación masiva de refresh tokens ahora actualiza tokens y registra auditoría dentro de una misma transacción.

## Patrón obligatorio para nuevos endpoints

Todo endpoint nuevo que escriba en más de una tabla debe seguir este patrón:

```ts
return this.sequelize.transaction(async (transaction) => {
  await this.assertParentRowsExist(..., transaction);
  const aggregate = await this.insertOrUpdateAggregate(..., transaction);
  await this.insertChildRows(..., transaction);
  await this.writeOutbox(..., transaction);
  await this.audit(..., transaction);
  return this.readResponse(aggregate.id, transaction);
});
```

Reglas:

- No insertar tabla hija antes de validar tabla padre.
- No borrar relaciones hijas antes de validar que las nuevas relaciones existan.
- No auditar una entidad que no fue validada o mutada correctamente.
- No crear outbox fuera de la transacción de la operación de negocio.
- No devolver lecturas administrativas fuera de la transacción si la respuesta depende de filas recién escritas.
- No convertir cualquier error en `ConflictException`; solo conflictos reales de unicidad.

## Prueba agregada

Se agregó:

```bash
yarn test:contracts
```

Y dentro de esa suite:

```txt
test/contracts/atomic-write-contracts.test.ts
```

Esta prueba inspecciona los servicios críticos para asegurar que los endpoints con escritura multi-tabla sigan usando transacciones y validaciones previas.
