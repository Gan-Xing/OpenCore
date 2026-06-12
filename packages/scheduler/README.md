# @opencore/scheduler

Scheduler runtime boundary for OpenCore.

This package owns job definitions, registry whitelist validation, manual
trigger policy, BullMQ adapter metadata and job run logs. API modules should
only import the module/service to expose HTTP routes and compose monitor
summaries.
