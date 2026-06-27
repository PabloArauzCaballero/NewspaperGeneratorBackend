# Smoke tests idempotentes y orden de ejecución

## Problema corregido

Antes, `scripts/smoke-http.ts` usaba `lector.demo@periodico.test` para probar checkout y webhook de pago. Eso convertía al lector gratuito seed en usuario premium después de correr `yarn test:smoke:http`.

Luego, si se ejecutaba `yarn test:smoke:db`, el smoke de base podía fallar con:

```txt
Expected premium article to exist for paywall checks
```

El mensaje era engañoso: el artículo premium sí existía, pero la consulta dependía de que `lector.demo@periodico.test` siguiera sin suscripción activa.

## Solución aplicada

- `smoke-http.ts` ahora crea un usuario efímero `smoke.checkout.*@periodico.test` para probar checkout y webhook.
- `smoke.ts` ya no depende del estado de suscripción de `lector.demo@periodico.test`.
- El smoke DB valida reglas estables:
  - existe al menos un artículo premium publicado;
  - los artículos premium no tienen publicidad activa asociada;
  - el índice de búsqueda no filtra el cuerpo premium protegido;
  - las notificaciones premium no llegan a usuarios sin suscripción activa.

## Limpieza si ya corriste el smoke anterior

Si tu base ya quedó contaminada porque el usuario seed `lector.demo@periodico.test` fue convertido en premium, puedes reiniciar todo:

```powershell
docker compose down -v
docker compose up -d postgres redis
yarn db:migrate
yarn db:seed
yarn test:smoke:db
```

O corregir solo ese usuario:

```powershell
docker compose exec postgres psql -U newspaper -d newspaper -c "UPDATE subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE user_id = (SELECT id FROM users WHERE email = 'lector.demo@periodico.test') AND status = 'active';"
```
