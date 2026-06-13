# Cycle-021 Round 16 Completion Report: core.menu Tree Metadata

Date: 2026-06-12  
Feature commit:
`4b0fa58 feat(core-menu): add tree metadata loop / 新增菜单树元数据闭环`

## Capability

`core.menu` now has a real tree-aware menu metadata loop. Operators can manage
parent/child menu structure, route component metadata, icons, status, cache and
visibility through the authenticated API and Admin page.

## Reference Comparison

RuoYi and Yudao treat menu management as the navigation and permission control
plane. OpenCore now admits the same foundational shape within its registry-owned
route model: directory parents, typed menu leaves, route component metadata and
guards that keep menu hierarchy consistent.

## Implemented

- Added menu tree metadata to contracts, OpenAPI, SDK and Admin types.
- Added Prisma menu parent relation and route metadata fields.
- Seeded registry-derived directory parents before leaf menus.
- Added repository checks for parent existence, self-parent rejection, cycle
  prevention and delete guards when children exist.
- Preserved proper `parentKey` nullable semantics for update requests.
- Replaced Admin Menus flat table with a tree table and parent `TreeSelect`.
- Added add-child, status, cache and hidden controls.
- Added fixed-port `core.menu` smoke and wired it into local/deploy scripts.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- Focused typecheck and tests for contracts, module-registry, system, SDK, API
  and Admin.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public API returned seeded tree metadata, created parent and child menus,
rejected parent deletion while a child existed, cleared a child parent with
`parentKey: null`, updated status/cache/hidden and cleaned up verification
menus. The public Admin Menus page returned 200 and the deployed chunk contains
tree operation markers.

## Scope Held

This round did not add role menu-tree assignment, drag-sort/save-sort, menu
cache refresh endpoints, runtime router generation or dynamic registry editing.
