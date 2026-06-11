# cycle-011 Reference Comparison

## NestWeb

- NestWeb RBAC and system modules separate stable read models from write services and permissions.
- OpenCore should preserve that separation by avoiding fake write affordances before write contracts are admitted.

## Antdpro6

- Antdpro6 action columns pair table operations with permission/current-state checks instead of leaving inert buttons enabled.
- Existing log/detail pages use explicit detail actions and avoid mutation controls for read-only diagnostics.

## RuoYi / ruoyi-vue-pro

- RuoYi-style system pages expose add/edit/delete only when the module has real permission-backed mutation handlers.
- Read-only log pages present query/detail/export behavior without record mutation controls.

## Yudao / yudao-ui-admin-vue3

- Yudao UI separates detail components from forms and uses permission directives around write actions.
- OpenCore should translate that into React wrappers with disabled mutation affordances and an explicit read-only reason while the module is fixture-backed.
