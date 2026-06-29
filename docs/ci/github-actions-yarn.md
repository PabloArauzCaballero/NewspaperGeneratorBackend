# GitHub Actions con Yarn

Este proyecto usa Yarn 4 y `nodeLinker: node-modules`. El workflow **no debe ejecutar `npm ci` ni `npm run ...`**.

## Por qué fallaba

El workflow anterior ejecutaba:

```bash
npm ci
```

Eso no corresponde con el proyecto cuando se decidió trabajar con Yarn. Además, en el log original apareció:

```txt
npm error Exit handler never called!
```

Ese mensaje era un fallo/colgado del propio npm CLI, no una prueba fallida del backend.

## Workflow correcto

La instalación debe usar:

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
yarn install
```

Si existe `yarn.lock`, CI usa:

```bash
yarn install --immutable
```

Y los comandos deben ejecutarse con Yarn:

```bash
yarn db:validate
yarn postman:validate
yarn audit:moderate
yarn typecheck
yarn build
yarn test:unit
yarn test:contracts
yarn db:migrate
yarn db:seed
yarn test:smoke:db
yarn test:smoke:http
yarn test:security
yarn start:worker:events:once
```

## Recomendación para CI estricto

Genera y commitea `yarn.lock`:

```powershell
yarn install
git add yarn.lock .yarnrc.yml package.json .github/workflows/ci.yml
git commit -m "ci: use yarn quality gate"
git push
```

Cuando `yarn.lock` exista, el workflow usará automáticamente `yarn install --immutable`.

## No usar

No usar estos comandos dentro del workflow:

```bash
npm ci
npm run build
npm audit --audit-level=moderate
```

En este proyecto deben ser:

```bash
yarn install
yarn build
yarn audit:moderate
```
