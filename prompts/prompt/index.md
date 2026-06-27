# Instrucciones generales de generación — Periódico Digital Premium

Trabaja con precisión máxima. Este proyecto es una plataforma editorial premium para un periódico reputado, no un CRUD básico.

Antes de generar código, lee:

1. `../SYSTEM_INFO_PERIODICO.md`
2. `../PROJECT_BRIEF_PERIODICO.md`
3. `../PROMPT_MASTER_PERIODICO.md`
4. `programacionGeneral.md`
5. El prompt específico del área.

## Stack obligatorio

- Backend: NestJS + TypeScript + Sequelize + PostgreSQL + Zod + JWT.
- Web: Next.js 15 + TypeScript + Tailwind + shadcn/ui.
- Infra: AWS + PostgreSQL + Redis + S3 + CloudFront + WAF + GitHub Actions.

## Regla de detención

Debes detenerte y pedir aclaración si falta información crítica sobre:

- Proveedor de pagos.
- Planes/precios premium.
- Renovación/cancelación/reembolso.
- Paywall y vista previa premium.
- Permisos editoriales.
- Moderación.
- Publicidad.
- Privacidad.
- Retención de datos.

## Regla fundamental: todo pendiente debe quedar señalado en Markdown

Todo pendiente, supuesto, bloqueo, decisión abierta, integración no definida o regla de negocio incompleta debe quedar señalado explícitamente en archivos `.md`.

Archivos obligatorios:

```txt
docs/
  pending/
    pending-items.md
```

En este paquete:

```txt
PENDIENTES_PERIODICO.md
prompt/PENDIENTES.md
```

Usa marcas: `TODO_PERIODICO:`, `PENDIENTE_PERIODICO:`, `BLOQUEANTE_PERIODICO:`, `SUPUESTO_PERIODICO:`, `RIESGO_PERIODICO:`.
