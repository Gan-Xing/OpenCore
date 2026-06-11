# cycle-014 Reference Comparison

## NestWeb

NestJS backends usually protect routes with decorators or guards that bind permissions at the route handler boundary. OpenCore mirrors that idea on the Admin side by checking not just that a permission exists, but that the route is bound to the expected access guard.

## Antdpro6

Ant Design Pro projects commonly use route `access` keys from `src/access.ts`. The risk is configuration drift between route metadata and access helpers. OpenCore now validates the route access key against the registry permission contract.

## RuoYi / ruoyi-vue-pro

RuoYi-style admin systems bind menus/routes to permission strings and treat mismatched permission metadata as an authorization bug. OpenCore keeps the same menu/route permission discipline through a registry-driven drift script.

## Yudao / yudao-ui-admin-vue3

Yudao admin menus and permissions are managed as explicit platform data. For OpenCore, module registry definitions are the source of truth, so generated or hand-edited Admin route access keys must stay aligned with registry route permissions.
