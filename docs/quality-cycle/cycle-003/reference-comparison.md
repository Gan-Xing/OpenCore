# cycle-003 Reference Comparison

## NestWeb

- Relevant files: `/home/ubuntu/dev/NestWeb/src/messages/dto/query-message.dto.ts`, `/home/ubuntu/dev/NestWeb/src/approval-requests/dto/query-approval-request.dto.ts`, `/home/ubuntu/dev/NestWeb/src/system-log/dto/query-log.dto.ts`.
- Reference behavior: query DTOs define table filters explicitly, not just pagination.
- OpenCore gap: collaboration list endpoints accept only page/pageSize.

## Antdpro6

- Relevant files: `/home/ubuntu/dev/Antdpro6/src/pages/MessageCenter`, `/home/ubuntu/dev/Antdpro6/src/pages/Approvals`, `/home/ubuntu/dev/Antdpro6/src/services`.
- Reference behavior: page service calls and table state preserve query/filter parameters.
- OpenCore gap: SDK client helpers only serialize page/pageSize for new module clients.

## RuoYi / ruoyi-vue-pro

- Relevant areas: monitor job/job-log, infra redis, system notice/mail/sms/oauth, report.
- Reference behavior: operational lists expose status/type/owner/filter fields and back-end filtering.
- OpenCore boundary: add filters only to admitted P0-P3/P4-lite modules; do not add CRM/ERP/MES/WMS/mall/member/pay production features.

## Yudao / yudao-ui-admin-vue3

- Relevant files: `src/api/system/notice`, `src/api/system/mail`, `src/api/system/sms`, `src/api/system/oauth2`, `src/api/infra/job`, `src/api/infra/redis`, `src/api/bpm/task`.
- Reference behavior: API wrappers accept query objects with filter fields and pass them through to list endpoints.
- OpenCore gap: query pass-through helpers in SDK module clients are too narrow for status/type/enabled filters.
