# OpenForge CI Gate

更新时间：2026-06-10

OpenForge V1 gate 是本地可重复执行的质量门禁。它不读取 `.env*`，不打印 secret，不写 Prisma schema 或 migration，不实现 P4/P5 模块。OpenForge 真实写入仍必须显式 `--yes`；gate 只运行 read-only、dry-run 和测试命令。

## Root Scripts

```bash
pnpm openforge:test
pnpm openforge:gate
```

`pnpm openforge:test` 运行 OpenForge Jest suite。`pnpm openforge:gate` 串联：

```bash
pnpm openforge:doctor
pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
```

## Full Local Gate

在提交 OpenForge V1 相关变更前运行：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:registry-tags:check
pnpm openapi:check
pnpm registry:admin-routes:check
pnpm openforge:doctor
pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json
pnpm openforge:gate
NX_DAEMON=false pnpm nx test contracts
NX_DAEMON=false pnpm nx test module-registry
NX_DAEMON=false pnpm nx test openforge
NX_DAEMON=false pnpm nx build openforge
```

## No-Write Check

After `openforge:doctor`, `openforge:gate`, or dry-run apply, the repo should not contain generated output directories unless a developer intentionally ran apply with `--yes`:

```bash
test ! -e .openforge
test ! -e apps/api/src/modules/generated
test ! -e apps/admin/src/pages/Generated
test ! -e docs/generated/openforge
test ! -e openforge-patches
test ! -e packages/sdk/src/generated
test ! -e prisma/openforge-drafts
```

If any of those paths exist unexpectedly, review the command history before committing. Do not delete user-owned generated output unless the current task explicitly asks for cleanup.

## CI Integration

A future CI job can run the same scripts in this order:

1. Install dependencies with the repo pnpm version.
2. Run `pnpm openforge:gate` before write-capable generator tests.
3. Run the full local gate commands above.
4. Treat Admin route/access binding drift or registry/OpenAPI tag drift as a failure.
5. Treat any generated output left by read-only or dry-run OpenForge commands as a failure.

OpenForge gate output is JSON-heavy by design. CI may redirect `openforge:gate` output to an artifact, but it must not hide non-zero exits.
