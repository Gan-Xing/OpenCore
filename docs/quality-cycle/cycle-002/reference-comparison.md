# cycle-002 Reference Comparison

## NestWeb

- Relevant files: `/home/ubuntu/dev/NestWeb/src/dashboard/*`, `/home/ubuntu/dev/NestWeb/src/messages/*`, `/home/ubuntu/dev/NestWeb/src/approval-requests/*`, `/home/ubuntu/dev/NestWeb/src/system-log/*`, `/home/ubuntu/dev/NestWeb/src/openapi.ts`.
- Reference behavior: dashboard and center endpoints expose high-signal counts before table drilldown; message and approval services keep bounded action contracts; system-log/openapi wiring is protected by tests.
- OpenCore gap: collaboration and operations modules have action APIs but no summary entry points; recursive gate does not run all drift scripts.

## Antdpro6

- Relevant files: `/home/ubuntu/dev/Antdpro6/src/access.ts`, `/home/ubuntu/dev/Antdpro6/src/pages/MessageCenter`, `/home/ubuntu/dev/Antdpro6/src/pages/Approvals`, `/home/ubuntu/dev/Antdpro6/src/components/TableExportButton`, `/home/ubuntu/dev/Antdpro6/src/services`.
- Reference behavior: admin pages present message/approval centers and stable route/access mappings; service clients provide page-level API wrappers.
- OpenCore gap: Admin pages list fixture rows for new modules but do not share contract-backed summary types through the SDK.

## RuoYi / ruoyi-vue-pro

- Relevant areas: `system`, `infra`, `monitor`, `tool`, `codegen`, `workflow`, `report`, `job`, `notice`, `mail`, `sms`, `oauth`, `pay`.
- Reference behavior: monitor/job/mail/sms/oauth/report are organized as operational centers with counts/status first, then list/detail commands.
- OpenCore boundary: keep BPMN/report designer/real pay/member/mall/CRM/ERP/MES/WMS out of core. Cycle 002 should only add summaries over already-admitted bounded modules.

## Yudao / yudao-ui-admin-vue3

- Relevant files: `src/api/system/notice`, `src/api/system/mail`, `src/api/system/sms`, `src/api/system/oauth2`, `src/api/infra/job`, `src/api/infra/redis`, `src/api/bpm`, `src/api/report`, plus domain modules under `mall`, `member`, `crm`, `erp`, `iot`, `ai`.
- Reference behavior: front-end API directories make each center discoverable and keep permission checks close to route/action surfaces.
- OpenCore boundary: do not import Vue/Java code or broaden into P4/P5 business domains. Add only TypeScript DTO/client/admin fixtures over admitted module codes.
