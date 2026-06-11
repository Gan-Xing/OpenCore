# cycle-018 Reference Comparison

## NestWeb

NestJS-backed admin exports typically treat filenames as output metadata and normalize them before response/download boundaries. OpenCore now applies that boundary on the browser CSV helper.

## Antdpro6

Ant Design Pro table export helpers often centralize CSV download behavior. OpenCore keeps filename cleanup in `CurrentPageExportButton` so generated pages do not each invent filename handling.

## RuoYi / ruoyi-vue-pro

RuoYi-style exports generally produce predictable local Excel/CSV names from server-side module metadata. OpenCore mirrors that expectation by forcing a local CSV basename for current-page downloads.

## Yudao / yudao-ui-admin-vue3

Yudao admin export flows keep download artifacts typed and module-scoped. OpenCore now preserves CSV-only current-page semantics by sanitizing generated filenames and enforcing the `.csv` extension.
