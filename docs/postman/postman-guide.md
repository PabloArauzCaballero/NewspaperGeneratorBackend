# Postman collection ideal

Archivos generados:

```txt
postman/NewspaperGeneratorBackend.postman_collection.json
postman/NewspaperGeneratorBackend.local.postman_environment.json
```

## Cómo usar

1. Levanta servicios:

```bash
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run start:dev
```

2. Importa en Postman:

- Collection: `NewspaperGeneratorBackend.postman_collection.json`
- Environment: `NewspaperGeneratorBackend.local.postman_environment.json`

3. Ejecuta carpetas en este orden:

```txt
00 - Health
01 - Auth
02 - Fixtures desde API admin
03 - Público y Premium
04 - Interacciones lector
05 - Suscripciones y pagos demo
06 - Admin CMS
07 - Eventos, Redis e indexado
08 - Errores de negocio esperados
```

## Qué valida la colección

- Login de todos los usuarios demo.
- Guardado automático de tokens en variables de colección.
- Obtención de IDs reales desde la API admin.
- Paywall premium sin fuga de cuerpo.
- Cero publicidad en premium.
- Flujo de comentarios y reacciones.
- Checkout demo y webhook.
- CMS editorial básico.
- Outbox/inbox event-driven.
- Invalidación Redis.
- Errores de negocio esperados: `400`, `401`, `403`, `409`, `404`.

## Variables principales

| Variable | Uso |
|---|---|
| `baseUrl` | URL base, por defecto `http://localhost:3000/api/v1`. |
| `adminToken` | Se guarda al ejecutar login admin. |
| `editorToken` | Se guarda al ejecutar login editor. |
| `journalistToken` | Se guarda al ejecutar login periodista. |
| `readerToken` | Se guarda al ejecutar login lector normal. |
| `premiumToken` | Se guarda al ejecutar login premium. |
| `publicArticleId` | Se detecta desde `GET /admin/articles`. |
| `premiumArticleId` | Se detecta desde `GET /admin/articles`. |
| `draftArticleId` | Se detecta desde `GET /admin/articles`. |
| `categoryId` | Se detecta desde `GET /categories`. |
| `tagId` | Se detecta desde `GET /tags`. |
| `planId` | Se detecta desde `GET /subscriptions/plans`. |

## Criterio de calidad

La colección no depende de IDs hardcodeados excepto slugs demo estables. Los IDs se resuelven por API para que el flujo siga funcionando aunque la base se regenere.

## Actualización 10/10

La colección ahora incluye:

- Refresh token premium.
- Logout de refresh token.
- Password reset demo.
- Health live/ready.
- Worker event-driven `admin/events/worker/run-once`.
- Seguridad admin: login attempts y worker runs.

Valida la colección con:

```bash
npm run postman:validate
```
