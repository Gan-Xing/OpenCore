import {
  OPENFORGE_FIELD_TYPES,
  type OpenForgeFieldType,
  type OpenForgeManualSchema,
} from '@opencore/contracts';

export const OPENFORGE_SCHEMA_V1_VERSION = 'openforge.schema.v1' as const;

export function isOpenForgeFieldType(
  value: string,
): value is OpenForgeFieldType {
  return (OPENFORGE_FIELD_TYPES as readonly string[]).includes(value);
}

export function getOpenForgeSchemaFieldNames(
  schema: OpenForgeManualSchema,
): Set<string> {
  return new Set((schema.fields ?? []).map((field) => field.name));
}

export function isOpenForgeSchemaV1(schema: OpenForgeManualSchema): boolean {
  return schema.schemaVersion === OPENFORGE_SCHEMA_V1_VERSION;
}
