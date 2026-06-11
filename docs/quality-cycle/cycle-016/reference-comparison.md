# cycle-016 Reference Comparison

## NestWeb

NestJS admin stacks typically centralize presentation redaction in serializers so metadata objects do not leak credentials when converted to text. OpenCore applies the same fallback principle to Admin filter/search text.

## Antdpro6

Ant Design Pro table filters are normally field-specific and bounded, but shared helpers often normalize arbitrary render/search values. OpenCore keeps that normalization in `CurrentPageFilters` and redacts sensitive object keys there.

## RuoYi / ruoyi-vue-pro

RuoYi-style management screens distinguish list search fields from detail/export surfaces and avoid exposing secret config values in admin text. OpenCore now protects the shared current-page search fallback in addition to detail and export serialization.

## Yudao / yudao-ui-admin-vue3

Yudao treats secrets and provider credentials as masked admin data, including in system configuration views. OpenCore mirrors that by preventing object-valued filter/search fallbacks from turning nested secrets into UI-searchable text.
