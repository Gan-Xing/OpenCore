# Export And Upload Contract

OpenCore uses shared contracts from `@opencore/contracts` for bounded export and file transfer shapes.

## Pagination, Sort, Filter

- `PageRequest` uses `page` and `pageSize`.
- `PageResponse<T>` uses `items`, `page`, `pageSize`, `total`, and `totalPages`.
- `QueryRequest` may add `sort` and `filters` with explicit field/operator/value descriptors.
- `normalizePageRequest` caps `pageSize` at `API_QUERY_CONTRACT.maxPageSize`.
- Admin current-page search/filter text must redact object-valued fallback fields before JSON stringification, covering password, secret, token, credential, authorization, API key and client secret keys.
- OpenForge generated Admin pages must exclude `sensitive` and `detailOnly`
  schema fields from current-page search/select field arrays and use shared
  current-page filter helpers rather than ProTable's unbounded built-in search.

## Errors

API errors use `ApiErrorResponseContract`:

- `success: false`
- stable `error.code`
- `statusCode`
- optional `path`, `requestId`, and `traceId`
- timestamp

## Export

Current-page export stays synchronous and bounded by `CURRENT_PAGE_EXPORT_PROTOCOL`:

- CSV only.
- `scope: current-page`.
- max 1000 rows.
- Download filenames must be sanitized to a local `.csv` basename before passing them to the browser.
- sensitive fields must be excluded or redacted before export.
- OpenForge generated export columns must use `CurrentPageExportColumn`
  metadata and mark `sensitive` or `detailOnly` schema fields with
  `sensitive: true` so the shared export helper excludes them before CSV
  serialization.
- Object-valued CSV cells must pass through recursive sensitive-key redaction before JSON stringification, covering password, secret, token, credential, authorization, API key and client secret fields.
- CSV cells must neutralize spreadsheet formula prefixes before serialization. Values beginning with optional whitespace followed by `=`, `+`, `-` or `@` are exported as text by prefixing an apostrophe.

## Upload / Download

`FileUploadContract` requires file name, MIME type, size, and optional checksum. `FileDownloadContract` requires id, filename, MIME type, size, storage key, and optional expiry. Storage keys must remain provider-neutral and scoped by the configured object prefix.
