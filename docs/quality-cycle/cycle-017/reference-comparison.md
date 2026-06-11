# cycle-017 Reference Comparison

## NestWeb

NestJS admin implementations often separate scalar DTO fields from nested metadata, but both surfaces must respect output redaction policy. OpenCore now gives scalar detail fields an explicit redaction marker.

## Antdpro6

Ant Design Pro detail drawers frequently render simple description fields directly. OpenCore keeps that path centralized in `ReadOnlyDetailDrawer` so sensitive scalar values render as `[redacted]`.

## RuoYi / ruoyi-vue-pro

RuoYi-style admin screens avoid exposing token and secret reference values in list/detail views. OpenCore now aligns provider and online-session details with its export-sensitive column policy.

## Yudao / yudao-ui-admin-vue3

Yudao masks system and integration secrets in administrative UIs rather than relying only on export exclusion. OpenCore mirrors that by redacting scalar secret refs and token ids in detail/list surfaces.
