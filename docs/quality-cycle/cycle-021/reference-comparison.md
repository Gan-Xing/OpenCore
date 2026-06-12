# cycle-021 Reference Comparison

Date: 2026-06-12

## Reference Revisions

- RuoYi-Vue remote HEAD checked: `41720e624c5a668c7d3777835e4c87095a7a1dfd`.
- Yudao / ruoyi-vue-pro remote HEAD checked:
  `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`.
- Local Yudao Admin checkout checked: `/home/ubuntu/dev/yudao-ui-admin-vue3`.

## RuoYi Notice Shape

RuoYi places notice management under System as "通知公告". The reference shape
includes:

- System menu entry and button-level permissions for query/add/edit/remove.
- List filters by title/operator/type/status.
- Detail/read view.
- Create, update and delete actions.
- Seeded notice type/status dictionaries and seeded notice rows.
- Additional read-status/header badge features.

OpenCore does not copy the Vue/Java/MyBatis implementation. The admitted shape
for this round is the management loop only: list/detail/create/update/delete and
publish/archive lifecycle.

## Yudao Notice Shape

Yudao keeps notice management under System and exposes:

- Page query, detail, create, update, delete and batch delete APIs.
- A form dialog for title/content/type/status.
- A push action.
- Separate in-site notify template/message capabilities.

OpenCore keeps push/in-site delivery out of this round. Publish/archive remains
an internal lifecycle action and does not imply WebSocket, mail, SMS or inbox
fan-out.

## OpenCore TS/NestJS Product Choice

- Use existing `@opencore/system` runtime and Prisma model.
- Add the missing detail read contract instead of adding read-status tables.
- Keep action permissions aligned to existing `core:notice:*` codes.
- Promote `/system/notices` through module-registry Admin metadata so
  `registry:admin-routes:check` can prevent future drift.
- Use `@opencore/sdk` as the Admin data boundary; no generated Umi OpenAPI chain
  and no vulnerable `mockjs` / `@umijs/openapi` dependency chain.
