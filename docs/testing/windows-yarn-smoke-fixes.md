# Correcciones para correr smokes en Windows con Yarn

Este proyecto está preparado para Yarn con `node_modules`, no Yarn Plug'n'Play. Por eso se incluye `.yarnrc.yml` con:

```yaml
nodeLinker: node-modules
```

## Scripts relevantes

- `yarn postman:validate`: valida JSON con Node/TypeScript, sin depender de `python3` ni `/dev/null`.
- `yarn test:security`: usa un `User-Agent` estable para que el rate limit se mida correctamente.
- `yarn start:worker:events:once`: usa `ts-node`, no `tsx`, porque NestJS necesita metadata de decoradores para inyección de dependencias en el application context.
- `yarn start`: arranca con `nest start` para desarrollo/local sin exigir `dist/main.js`.
- `yarn start:prod`: arranca `node dist/main.js` y requiere `yarn build` previo.

## Orden recomendado

```powershell
yarn install
docker compose up -d postgres redis
yarn db:migrate
yarn db:seed
yarn start:dev
```

En otra terminal:

```powershell
yarn test:smoke:http
yarn test:security
yarn start:worker:events:once
```
