# Cycle-021 Round 21 Completion Report: core.dict Item Data Simple-list

Date: 2026-06-12  
Feature commit:
`07d4e9b feat(core-dict): add item data simple-list loop / 新增字典数据项消费闭环`

## Capability

`core.dict` now has an item-data and public consumer loop. Operators can manage
dictionary items from the Dicts page, while applications can read enabled
options from a public simple-list endpoint that filters disabled items and
disabled dictionary types.

## Reference Comparison

RuoYi and Yudao both split dictionary types from dictionary data and expose
consumer-style option endpoints. OpenCore keeps its existing `DictType` plus
items model, but admits the same product shape through item-level management
endpoints and `/api/core/dict-data/simple-list`.

## Implemented

- Added `DictDataOption` and dict item create/update DTOs.
- Added strict runtime validation for item booleans and sort values.
- Added public `GET /api/core/dict-data/simple-list` with optional
  `dictCode` filtering.
- Added item management endpoints under `/api/core/dicts/:code/items`.
- Implemented item CRUD and simple-list filtering in seed and Prisma
  repositories.
- Extended OpenAPI, SDK contracts/client methods and SDK tests.
- Added Admin Dicts row-level `Dictionary Items` modal with item CRUD and
  simple-list visibility feedback.
- Added fixed-port/deploy/public `core.dict` smoke for item CRUD, malformed
  boolean rejection and disabled item/type filtering.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- Syntax checks for the new smoke script and deploy/local smoke shell scripts.
- Focused system, SDK and API permission-matrix tests.
- Focused typecheck for system, API and Admin.
- Admin tests, OpenAPI export/check, SDK check and registry checks.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.dict` smoke created a temporary dictionary, rejected a string
boolean item payload with 400, created items, proved public simple-list only
returned enabled items under enabled dictionary types, updated and deleted an
item, and cleaned up the dictionary. The public Admin Dicts page returned 200
and the deployed Dicts chunk contains the item-management UI and service
markers.

## Scope Held

This round did not add dictionary batch delete, Excel import/export file
workflows, color/css/remark metadata, app-wide dictionary cache TTL/
invalidation or a separate dictionary-data Admin page. Those remain future
dictionary-product depth outside the current foundation waterline.
