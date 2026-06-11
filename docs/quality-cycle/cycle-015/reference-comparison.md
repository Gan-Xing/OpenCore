# cycle-015 Reference Comparison

## NestWeb

NestJS platforms usually centralize redaction in serializers/loggers so nested metadata does not leak secrets when it is rendered or exported. OpenCore now applies that same fallback principle to client-side CSV object cells.

## Antdpro6

Ant Design Pro table export helpers typically centralize cell serialization. OpenCore keeps `CurrentPageExportButton` as that shared boundary and applies nested redaction there rather than relying only on each page's export columns.

## RuoYi / ruoyi-vue-pro

RuoYi-style admin exports are treated as an authorization and serialization surface. OpenCore already excludes sensitive columns; this cycle adds a final nested-object redaction fallback for columns that are legitimately exported as summaries.

## Yudao / yudao-ui-admin-vue3

Yudao separates list/detail/export permissions and avoids exposing secret config values in Admin output. OpenCore mirrors that by combining sensitive-column exclusion with recursive object-cell masking before CSV serialization.
