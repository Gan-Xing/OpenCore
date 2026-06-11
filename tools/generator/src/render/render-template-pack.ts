import {
  OPENFORGE_GENERATED_MARKER_SIGNATURE,
  formatOpenForgeGeneratedMarker,
  type OpenForgeArtifactContent,
  type OpenForgeArtifactKind,
  type OpenForgeFieldSchema,
  type OpenForgeGeneratorConfig,
  type OpenForgeGeneratedMarker,
  type OpenForgeManualSchema,
  type OpenForgeTemplateDefinition,
  type OpenForgeVirtualFile,
} from '@opencore/contracts';
import { createStableHash } from '../hash/stable-hash';
import { OPENFORGE_DETERMINISTIC_TIMESTAMP } from '../planner/generate-plan';
import { evaluatePathSafety } from '../safety/path-safety';
import { OPENFORGE_DEFAULT_TEMPLATE_PACK } from '../templates/default-template-pack';

type NameParts = {
  layer: string;
  moduleResource: string;
  resource: string;
  camel: string;
  pascal: string;
  title: string;
  moduleCode: string;
};

function toPascalCase(value: string): string {
  return value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);

  return `${pascal.slice(0, 1).toLowerCase()}${pascal.slice(1)}`;
}

function getNameParts(schema: OpenForgeManualSchema): NameParts {
  const [layer = 'generated', moduleResource = schema.resource] =
    schema.moduleCode.split('.');

  return {
    layer,
    moduleResource,
    resource: schema.resource,
    camel: toCamelCase(schema.resource),
    pascal: toPascalCase(schema.resource),
    title: schema.title,
    moduleCode: schema.moduleCode,
  };
}

function applyOutputRoot(targetPath: string, outputRoot: string): string {
  if (!outputRoot || outputRoot === '.') {
    return targetPath;
  }

  return `${outputRoot.replace(/\/+$/, '')}/${targetPath}`;
}

function renderTargetPath(
  template: OpenForgeTemplateDefinition,
  schema: OpenForgeManualSchema,
  config: OpenForgeGeneratorConfig,
): string {
  const names = getNameParts(schema);
  const targetPath = template.targetPathPattern
    .replaceAll('{layer}', names.layer)
    .replaceAll('{moduleResource}', names.moduleResource)
    .replaceAll('{resource}', names.resource)
    .replaceAll('{camel}', names.camel)
    .replaceAll('{pascal}', names.pascal)
    .replaceAll('{moduleCode}', names.moduleCode);

  return applyOutputRoot(targetPath, config.outputRoot);
}

function renderMarkerComment(marker: OpenForgeGeneratedMarker): string {
  return [
    '/*',
    ...formatOpenForgeGeneratedMarker(marker)
      .split('\n')
      .map((line) => ` * ${line}`),
    ' */',
  ].join('\n');
}

function renderMarkdownMarker(marker: OpenForgeGeneratedMarker): string {
  return [
    '<!--',
    ...formatOpenForgeGeneratedMarker(marker).split('\n'),
    '-->',
  ].join('\n');
}

function renderFieldList(schema: OpenForgeManualSchema): string {
  return schema.fields
    .map(
      (field) =>
        `- ${field.name}: ${field.type}${field.required ? ' required' : ''}`,
    )
    .join('\n');
}

function quoteString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderStringArray(values: readonly string[]): string {
  return `[${values.map((value) => quoteString(value)).join(', ')}]`;
}

const GENERATED_ADMIN_SENSITIVE_FIELD_PATTERN =
  /password|secret|token|credential|authorization|api[-_]?key|client[-_]?secret/i;
const GENERATED_ADMIN_DETAIL_ONLY_FIELD_PATTERN =
  /payload|body|comment|query[-_]?schema|queryschema|params?|config|template[-_]?body|revoked[-_]?reason|revokedreason/i;

function getGeneratedAdminFieldSignal(field: OpenForgeFieldSchema): string {
  return `${field.name} ${field.title}`;
}

function isGeneratedAdminDetailOnlyField(field: OpenForgeFieldSchema): boolean {
  return (
    field.detailOnly === true ||
    GENERATED_ADMIN_DETAIL_ONLY_FIELD_PATTERN.test(
      getGeneratedAdminFieldSignal(field),
    )
  );
}

function isGeneratedAdminSensitiveField(field: OpenForgeFieldSchema): boolean {
  return (
    field.sensitive === true ||
    isGeneratedAdminDetailOnlyField(field) ||
    GENERATED_ADMIN_SENSITIVE_FIELD_PATTERN.test(
      getGeneratedAdminFieldSignal(field),
    )
  );
}

function getIdentityField(schema: OpenForgeManualSchema): OpenForgeFieldSchema {
  return (
    schema.fields.find((field) => field.name === 'id') ??
    schema.fields.find((field) => field.name === 'code') ??
    schema.fields[0]
  );
}

function getPermissionForAction(
  schema: OpenForgeManualSchema,
  action: string,
): string | undefined {
  return (
    schema.permissions.find((permission) =>
      permission.endsWith(`:${action}`),
    ) ?? schema.permissions[0]
  );
}

function renderRequirePermission(
  schema: OpenForgeManualSchema,
  action: string,
): string {
  const permission = getPermissionForAction(schema, action);

  return permission ? `  @RequirePermission(${quoteString(permission)})` : '';
}

function fieldTypeScriptType(field: OpenForgeFieldSchema): string {
  if (field.enumValues && field.enumValues.length > 0) {
    return field.enumValues.map((value) => quoteString(value)).join(' | ');
  }

  if (field.type === 'boolean') {
    return 'boolean';
  }

  if (field.type === 'number') {
    return 'number';
  }

  if (field.type === 'json') {
    return 'Record<string, unknown>';
  }

  return 'string';
}

function swaggerDecoratorForField(
  field: OpenForgeFieldSchema,
  optional: boolean,
): string {
  const decorator = optional ? 'ApiPropertyOptional' : 'ApiProperty';
  const options = [`description: ${quoteString(field.title)}`];

  if (field.enumValues && field.enumValues.length > 0) {
    options.push(`enum: ${renderStringArray(field.enumValues)}`);
  }

  if (field.type === 'json') {
    options.push('type: Object');
  }

  if (field.type === 'datetime') {
    options.push(`example: ${quoteString('2026-06-10T00:00:00.000Z')}`);
  }

  if (field.type === 'file') {
    options.push(`example: ${quoteString('s3://opencore/generated-file')}`);
  }

  return `  @${decorator}({ ${options.join(', ')} })`;
}

function renderDtoField(
  field: OpenForgeFieldSchema,
  forceOptional = false,
): string {
  const optional = forceOptional || !field.required;

  return `${swaggerDecoratorForField(field, optional)}
  ${field.name}${optional ? '?' : '!'}: ${fieldTypeScriptType(field)};`;
}

function renderFieldClassBody(
  fields: readonly OpenForgeFieldSchema[],
  forceOptional = false,
): string {
  return fields
    .map((field) => renderDtoField(field, forceOptional))
    .join('\n\n');
}

function getFieldsByName(
  schema: OpenForgeManualSchema,
  fieldNames: readonly string[],
): readonly OpenForgeFieldSchema[] {
  return fieldNames.flatMap((fieldName) => {
    const field = schema.fields.find(
      (candidate) => candidate.name === fieldName,
    );

    return field ? [field] : [];
  });
}

function controllerBasePath(schema: OpenForgeManualSchema): string {
  const names = getNameParts(schema);
  const firstPath =
    schema.openapi.paths?.[0] ??
    `/api/generated/${names.layer}/${names.resource}`;

  return firstPath.replace(/^\/api\//, '').replace(/^\//, '');
}

function sdkRequestPath(path: string): `/${string}` {
  const normalizedPath = path.replace(/^\/api(?=\/)/, '');

  return (
    normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  ) as `/${string}`;
}

function sdkListPath(schema: OpenForgeManualSchema): `/${string}` {
  return sdkRequestPath(
    schema.openapi.paths?.[0] ?? `/api/${controllerBasePath(schema)}`,
  );
}

function sdkExportPath(schema: OpenForgeManualSchema): `/${string}` {
  const exportPath = schema.openapi.paths?.find((path) =>
    path.includes('/export'),
  );

  return sdkRequestPath(exportPath ?? `${sdkListPath(schema)}/export`);
}

function sdkDetailPathTemplate(schema: OpenForgeManualSchema): `/${string}` {
  const identityField = getIdentityField(schema);
  const detailPath = schema.openapi.paths?.find((path) => path.includes('{'));

  return sdkRequestPath(
    detailPath ?? `${sdkListPath(schema)}/{${identityField.name}}`,
  );
}

function renderTypeMembers(
  fields: readonly OpenForgeFieldSchema[],
  forceOptional = false,
): string {
  return fields
    .map(
      (field) =>
        `  ${field.name}${forceOptional || !field.required ? '?' : ''}: ${fieldTypeScriptType(field)};`,
    )
    .join('\n');
}

function renderApiDtoContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const formFields = getFieldsByName(schema, schema.form.fields);
  const filterFields = getFieldsByName(schema, schema.filter?.fields ?? []);
  const sortFields = schema.sort?.fields ?? [];

  return `${markerComment}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${names.pascal}Dto {
${renderFieldClassBody(schema.fields)}
}

export class Create${names.pascal}Dto {
${renderFieldClassBody(formFields)}
}

export class Update${names.pascal}Dto {
${renderFieldClassBody(formFields, true)}
}

export class ${names.pascal}QueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: ${schema.list.defaultPageSize ?? 10} })
  pageSize?: number;

${renderFieldClassBody(filterFields, true)}

  @ApiPropertyOptional({ description: 'Sort field', enum: ${renderStringArray(sortFields)} })
  sortBy?: ${sortFields.length > 0 ? sortFields.map((field) => quoteString(field)).join(' | ') : 'string'};

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'] })
  sortDirection?: 'asc' | 'desc';
}

export class ${names.pascal}ListResponseDto {
  @ApiProperty({ type: [${names.pascal}Dto] })
  items!: ${names.pascal}Dto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class ${names.pascal}DeleteResultDto {
  @ApiProperty()
  deleted!: boolean;
}

export class ${names.pascal}ExportRequestDto {
  @ApiPropertyOptional({ description: 'Columns to export', type: [String] })
  columns?: string[];
}
`;
}

function renderApiRepositoryContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import {
  Create${names.pascal}Dto,
  ${names.pascal}Dto,
  ${names.pascal}ExportRequestDto,
  ${names.pascal}ListResponseDto,
  ${names.pascal}QueryDto,
  Update${names.pascal}Dto,
} from './${names.resource}.dto';

export const ${names.pascal.toUpperCase()}_REPOSITORY = Symbol('OPENFORGE_${names.pascal.toUpperCase()}_REPOSITORY');

export type ${names.pascal}Identity = ${fieldTypeScriptType(identityField)};

export type ${names.pascal}Repository = {
  list(query: ${names.pascal}QueryDto): Promise<${names.pascal}ListResponseDto>;
  getBy${toPascalCase(identityField.name)}(${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}Dto | null>;
  create(input: Create${names.pascal}Dto): Promise<${names.pascal}Dto>;
  update(${identityField.name}: ${names.pascal}Identity, input: Update${names.pascal}Dto): Promise<${names.pascal}Dto>;
  delete(${identityField.name}: ${names.pascal}Identity): Promise<boolean>;
  exportRows(request: ${names.pascal}ExportRequestDto): Promise<${names.pascal}Dto[]>;
};

export class Generated${names.pascal}Repository implements ${names.pascal}Repository {
  private readonly message = 'OpenForge generated repository placeholder: provide a real repository before registering this module.';

  list(query: ${names.pascal}QueryDto): Promise<${names.pascal}ListResponseDto> {
    void query;
    return Promise.reject(new Error(this.message));
  }

  getBy${toPascalCase(identityField.name)}(${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}Dto | null> {
    void ${identityField.name};
    return Promise.reject(new Error(this.message));
  }

  create(input: Create${names.pascal}Dto): Promise<${names.pascal}Dto> {
    void input;
    return Promise.reject(new Error(this.message));
  }

  update(${identityField.name}: ${names.pascal}Identity, input: Update${names.pascal}Dto): Promise<${names.pascal}Dto> {
    void ${identityField.name};
    void input;
    return Promise.reject(new Error(this.message));
  }

  delete(${identityField.name}: ${names.pascal}Identity): Promise<boolean> {
    void ${identityField.name};
    return Promise.reject(new Error(this.message));
  }

  exportRows(request: ${names.pascal}ExportRequestDto): Promise<${names.pascal}Dto[]> {
    void request;
    return Promise.reject(new Error(this.message));
  }
}
`;
}

function renderApiServiceContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import { Inject, Injectable } from '@nestjs/common';
import {
  Create${names.pascal}Dto,
  ${names.pascal}Dto,
  ${names.pascal}ExportRequestDto,
  ${names.pascal}ListResponseDto,
  ${names.pascal}QueryDto,
  Update${names.pascal}Dto,
} from './${names.resource}.dto';
import {
  ${names.pascal.toUpperCase()}_REPOSITORY,
  type ${names.pascal}Identity,
  type ${names.pascal}Repository,
} from './${names.resource}.repository';

@Injectable()
export class ${names.pascal}Service {
  readonly resource = ${quoteString(names.resource)};

  constructor(
    @Inject(${names.pascal.toUpperCase()}_REPOSITORY)
    private readonly repository: ${names.pascal}Repository,
  ) {}

  list(query: ${names.pascal}QueryDto): Promise<${names.pascal}ListResponseDto> {
    return this.repository.list(query);
  }

  get(${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}Dto | null> {
    return this.repository.getBy${toPascalCase(identityField.name)}(${identityField.name});
  }

  create(input: Create${names.pascal}Dto): Promise<${names.pascal}Dto> {
    return this.repository.create(input);
  }

  update(${identityField.name}: ${names.pascal}Identity, input: Update${names.pascal}Dto): Promise<${names.pascal}Dto> {
    return this.repository.update(${identityField.name}, input);
  }

  delete(${identityField.name}: ${names.pascal}Identity): Promise<boolean> {
    return this.repository.delete(${identityField.name});
  }

  exportRows(request: ${names.pascal}ExportRequestDto): Promise<${names.pascal}Dto[]> {
    return this.repository.exportRows(request);
  }
}
`;
}

function renderApiControllerContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../core/rbac/permissions.decorator';
import {
  Create${names.pascal}Dto,
  ${names.pascal}DeleteResultDto,
  ${names.pascal}Dto,
  ${names.pascal}ExportRequestDto,
  ${names.pascal}ListResponseDto,
  ${names.pascal}QueryDto,
  Update${names.pascal}Dto,
} from './${names.resource}.dto';
import type { ${names.pascal}Identity } from './${names.resource}.repository';
import { ${names.pascal}Service } from './${names.resource}.service';

@ApiTags(${quoteString(schema.openapi.tags[0] ?? schema.title)})
@Controller(${quoteString(controllerBasePath(schema))})
export class ${names.pascal}Controller {
  constructor(private readonly service: ${names.pascal}Service) {}

  @Get()
${renderRequirePermission(schema, 'read')}
  @ApiOperation({ summary: 'List ${schema.title}' })
  @ApiOkResponse({ type: ${names.pascal}ListResponseDto })
  list(@Query() query: ${names.pascal}QueryDto): Promise<${names.pascal}ListResponseDto> {
    return this.service.list(query);
  }

  @Get('export')
${renderRequirePermission(schema, 'export')}
  @ApiOperation({ summary: 'Export ${schema.title}' })
  @ApiOkResponse({ type: [${names.pascal}Dto] })
  exportRows(@Query() request: ${names.pascal}ExportRequestDto): Promise<${names.pascal}Dto[]> {
    return this.service.exportRows(request);
  }

  @Get(':${identityField.name}')
${renderRequirePermission(schema, 'read')}
  @ApiOperation({ summary: 'Get one ${schema.title}' })
  @ApiParam({ name: ${quoteString(identityField.name)} })
  @ApiOkResponse({ type: ${names.pascal}Dto })
  get(@Param(${quoteString(identityField.name)}) ${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}Dto | null> {
    return this.service.get(${identityField.name});
  }

  @Post()
${renderRequirePermission(schema, 'create')}
  @ApiOperation({ summary: 'Create ${schema.title}' })
  @ApiBody({ type: Create${names.pascal}Dto })
  @ApiOkResponse({ type: ${names.pascal}Dto })
  create(@Body() input: Create${names.pascal}Dto): Promise<${names.pascal}Dto> {
    return this.service.create(input);
  }

  @Patch(':${identityField.name}')
${renderRequirePermission(schema, 'update')}
  @ApiOperation({ summary: 'Update ${schema.title}' })
  @ApiParam({ name: ${quoteString(identityField.name)} })
  @ApiBody({ type: Update${names.pascal}Dto })
  @ApiOkResponse({ type: ${names.pascal}Dto })
  update(
    @Param(${quoteString(identityField.name)}) ${identityField.name}: ${names.pascal}Identity,
    @Body() input: Update${names.pascal}Dto,
  ): Promise<${names.pascal}Dto> {
    return this.service.update(${identityField.name}, input);
  }

  @Delete(':${identityField.name}')
${renderRequirePermission(schema, 'delete')}
  @ApiOperation({ summary: 'Delete ${schema.title}' })
  @ApiParam({ name: ${quoteString(identityField.name)} })
  @ApiOkResponse({ type: ${names.pascal}DeleteResultDto })
  async delete(@Param(${quoteString(identityField.name)}) ${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}DeleteResultDto> {
    return { deleted: await this.service.delete(${identityField.name}) };
  }
}
`;
}

function renderApiModuleContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import { Module } from '@nestjs/common';
import { ${names.pascal}Controller } from './${names.resource}.controller';
import {
  Generated${names.pascal}Repository,
  ${names.pascal.toUpperCase()}_REPOSITORY,
} from './${names.resource}.repository';
import { ${names.pascal}Service } from './${names.resource}.service';

@Module({
  controllers: [${names.pascal}Controller],
  providers: [
    ${names.pascal}Service,
    {
      provide: ${names.pascal.toUpperCase()}_REPOSITORY,
      useClass: Generated${names.pascal}Repository,
    },
  ],
  exports: [${names.pascal}Service],
})
export class ${names.pascal}Module {}
`;
}

function renderApiSpecContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);
  const readPermission = getPermissionForAction(schema, 'read');

  return `${markerComment}
import { ${names.pascal}Controller } from './${names.resource}.controller';
import { ${names.pascal}Dto } from './${names.resource}.dto';
import { Generated${names.pascal}Repository } from './${names.resource}.repository';
import { ${names.pascal}Service } from './${names.resource}.service';

describe('${names.pascal} generated API skeleton', () => {
  it('wires the controller to the generated service contract', async () => {
    const repository = new Generated${names.pascal}Repository();
    const service = new ${names.pascal}Service(repository);
    const controller = new ${names.pascal}Controller(service);
    const dto = new ${names.pascal}Dto();
    const expectedPermissions = ${renderStringArray(schema.permissions)} as const;

    dto.${identityField.name} = ${identityField.type === 'number' ? '1' : quoteString('example')};
    expect(controller).toBeDefined();
    expect(service.resource).toBe(${quoteString(names.resource)});
    expect(dto).toBeInstanceOf(${names.pascal}Dto);
    expect(expectedPermissions).toContain(${quoteString(readPermission ?? '')});
    await expect(repository.list({})).rejects.toThrow('placeholder');
  });
});
`;
}

function renderAdminRecordType(schema: OpenForgeManualSchema): string {
  return `export type ${getNameParts(schema).pascal}Record = {
${schema.fields
  .map(
    (field) =>
      `  ${field.name}${field.required ? '' : '?'}: ${fieldTypeScriptType(field)};`,
  )
  .join('\n')}
};`;
}

function renderAdminPermissionMap(schema: OpenForgeManualSchema): string {
  const names = getNameParts(schema);
  const entries = schema.actions
    .map((action) => {
      const permission = getPermissionForAction(schema, action);

      return permission ? `  ${action}: ${quoteString(permission)},` : '';
    })
    .filter(Boolean)
    .join('\n');

  return `export const generated${names.pascal}Permissions = {
${entries}
} as const;

export type Generated${names.pascal}Action = keyof typeof generated${names.pascal}Permissions;

export function canUseGenerated${names.pascal}Action(
  action: Generated${names.pascal}Action,
  grantedPermissions: readonly string[] = Object.values(generated${names.pascal}Permissions),
): boolean {
  return grantedPermissions.includes(generated${names.pascal}Permissions[action]);
}`;
}

function renderAdminColumn(field: OpenForgeFieldSchema): string {
  if (isGeneratedAdminSensitiveField(field)) {
    return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},
    ellipsis: true,
    render: () => <Tag>[redacted]</Tag>,
  },`;
  }

  if (field.type === 'boolean') {
    return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},
    valueType: 'switch',
    render: (_, record) => (
      <Tag color={record.${field.name} ? 'green' : 'default'}>
        {record.${field.name} ? 'Enabled' : 'Disabled'}
      </Tag>
    ),
  },`;
  }

  if (field.enumValues && field.enumValues.length > 0) {
    return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},
    valueEnum: {
${field.enumValues
  .map((value) => `      ${value}: { text: ${quoteString(value)} },`)
  .join('\n')}
    },
    render: (_, record) => <Tag>{String(record.${field.name} ?? '-')}</Tag>,
  },`;
  }

  if (field.type === 'datetime') {
    return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},
    valueType: 'dateTime',
  },`;
  }

  return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},
    ellipsis: true,
  },`;
}

function renderAdminExportColumn(field: OpenForgeFieldSchema): string {
  const sensitiveLine = isGeneratedAdminSensitiveField(field)
    ? '\n    sensitive: true,'
    : '';

  return `  {
    title: ${quoteString(field.title)},
    dataIndex: ${quoteString(field.name)},${sensitiveLine}
  },`;
}

function isGeneratedAdminSelectFilterField(
  field: OpenForgeFieldSchema,
): boolean {
  return field.type === 'boolean' || Boolean(field.enumValues?.length);
}

function renderAdminSelectFilter(field: OpenForgeFieldSchema): string {
  return `    {
      key: ${quoteString(field.name)},
      options: createCurrentPageFilterOptions(rows, ${quoteString(field.name)}),
      placeholder: ${quoteString(`Filter ${field.title}`)},
      predicate: (record, value) => String(record.${field.name} ?? '') === value,
    },`;
}

function renderAdminDetailField(field: OpenForgeFieldSchema): string {
  const sensitiveLine = isGeneratedAdminSensitiveField(field)
    ? '\n    sensitive: true,'
    : '';

  return `  {
    label: ${quoteString(field.title)},${sensitiveLine}
    value: renderGeneratedDetailValue(record.${field.name}),
  },`;
}

function renderAdminJsonSection(field: OpenForgeFieldSchema): string {
  return `  {
    title: ${quoteString(field.title)},
    value: record.${field.name},
  },`;
}

function renderAdminFormControl(field: OpenForgeFieldSchema): string {
  const commonProps = [
    `name=${quoteString(field.name)}`,
    `label=${quoteString(field.title)}`,
    field.required ? 'rules={[{ required: true }]}' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (field.type === 'boolean') {
    return `      <ProFormSwitch ${commonProps} />`;
  }

  if (field.type === 'number') {
    return `      <ProFormDigit ${commonProps} />`;
  }

  if (field.enumValues && field.enumValues.length > 0) {
    return `      <ProFormSelect
        ${commonProps}
        valueEnum={{
${field.enumValues
  .map((value) => `          ${value}: { text: ${quoteString(value)} },`)
  .join('\n')}
        }}
      />`;
  }

  if (field.type === 'text' || field.type === 'json') {
    return `      <ProFormTextArea ${commonProps} />`;
  }

  return `      <ProFormText ${commonProps} />`;
}

function renderAdminPageContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const listFields = getFieldsByName(schema, schema.list.columns);
  const exportFields = getFieldsByName(
    schema,
    schema.export?.columns ?? schema.list.columns,
  );
  const filterFields = getFieldsByName(
    schema,
    schema.filter?.fields ?? [],
  ).filter((field) => !isGeneratedAdminSensitiveField(field));
  const searchFields = filterFields.length > 0 ? filterFields : listFields;
  const selectFilterFields = filterFields.filter((field) =>
    isGeneratedAdminSelectFilterField(field),
  );

  return `${markerComment}
import { useEffect, useMemo, useState } from 'react';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Empty, Result, Tag } from 'antd';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../../shared/CurrentPageFilters';
import ${names.pascal}Detail from './components/${names.pascal}Detail';
import ${names.pascal}Form from './components/${names.pascal}Form';

${renderAdminRecordType(schema)}

${renderAdminPermissionMap(schema)}

const generated${names.pascal}Client = {
  async list(): Promise<${names.pascal}Record[]> {
    return [];
  },
};

const columns: ProColumns<${names.pascal}Record>[] = [
${listFields.map((field) => renderAdminColumn(field)).join('\n')}
];

const exportColumns: CurrentPageExportColumn<${names.pascal}Record>[] = [
${exportFields.map((field) => renderAdminExportColumn(field)).join('\n')}
];

const currentPageSearchFields: CurrentPageSearchField<${names.pascal}Record>[] = ${renderStringArray(
    searchFields.map((field) => field.name),
  )};

export default function Generated${names.pascal}Page() {
  const [rows, setRows] = useState<${names.pascal}Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<${names.pascal}Record>();
  const canCreate = canUseGenerated${names.pascal}Action('create');
  const canExport = canUseGenerated${names.pascal}Action('export');
  const selectFilters = useMemo<CurrentPageFilterOption<${names.pascal}Record>[]>(
    () => [
${selectFilterFields.map((field) => renderAdminSelectFilter(field)).join('\n')}
    ],
    [rows],
  );
  const { filteredRows, toolbar: currentPageFilterToolbar } = useCurrentPageFilters({
    rows,
    searchFields: currentPageSearchFields,
    searchPlaceholder: ${quoteString(`Search ${schema.list.title}`)},
    selectFilters,
  });
  const tableColumns = useMemo<ProColumns<${names.pascal}Record>[]>(
    () => [
      ...columns,
      {
        title: 'Actions',
        valueType: 'option',
        render: (_, record) => [
          <Button key="detail" type="link" onClick={() => setSelectedRecord(record)}>
            Detail
          </Button>,
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    let active = true;

    setLoading(true);
    void generated${names.pascal}Client
      .list()
      .then((data) => {
        if (!active) {
          return;
        }

        setRows(data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setRows([]);
        setLoadError(error instanceof Error ? error.message : 'Unknown generated client error');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer title=${quoteString(schema.list.title)} subTitle="OpenForge generated">
      {loadError ? (
        <Result status="error" title="Unable to load generated records" subTitle={loadError} />
      ) : null}
      <ProTable<${names.pascal}Record>
        rowKey=${quoteString(getIdentityField(schema).name)}
        columns={tableColumns}
        dataSource={filteredRows}
        loading={loading}
        search={false}
        options={false}
        locale={{
          emptyText: <Empty description="No generated records" />,
        }}
        toolBarRender={() => [
          currentPageFilterToolbar,
          <${names.pascal}Form key="create" disabled={!canCreate} />,
          <CurrentPageExportButton<${names.pascal}Record>
            key="export"
            disabled={!canExport}
            columns={exportColumns}
            resource=${quoteString(names.resource)}
            rows={filteredRows}
          />,
        ]}
      />
      <${names.pascal}Detail
        record={selectedRecord}
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(undefined);
          }
        }}
      />
    </PageContainer>
  );
}
`;
}

function renderAdminFormContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
  mode: 'drawer' | 'modal',
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const formFields = getFieldsByName(schema, schema.form.fields);
  const componentName = mode === 'drawer' ? 'DrawerForm' : 'ModalForm';

  return `${markerComment}
import {
  ${componentName},
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import type { ${names.pascal}Record } from '../index';

export type ${names.pascal}${mode === 'drawer' ? 'Drawer' : 'Form'}Props = {
  disabled?: boolean;
  initialValues?: Partial<${names.pascal}Record>;
  onSubmit?: (values: Partial<${names.pascal}Record>) => Promise<void> | void;
};

export default function ${names.pascal}${mode === 'drawer' ? 'Drawer' : 'Form'}({
  disabled = false,
  initialValues,
  onSubmit,
}: ${names.pascal}${mode === 'drawer' ? 'Drawer' : 'Form'}Props) {
  return (
    <${componentName}<Partial<${names.pascal}Record>>
      title=${quoteString(schema.form.title)}
      trigger={
        <Button type="primary" disabled={disabled}>
          New ${schema.title}
        </Button>
      }
      initialValues={initialValues}
      onFinish={async (values) => {
        await onSubmit?.(values);
        return true;
      }}
    >
${formFields.map((field) => renderAdminFormControl(field)).join('\n')}
    </${componentName}>
  );
}
`;
}

function renderAdminDetailContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const detailFields = getFieldsByName(schema, schema.detail.fields);
  const scalarDetailFields = detailFields.filter(
    (field) => field.type !== 'json' || isGeneratedAdminSensitiveField(field),
  );
  const jsonDetailFields = detailFields.filter(
    (field) => field.type === 'json' && !isGeneratedAdminSensitiveField(field),
  );

  return `${markerComment}
import { Empty } from 'antd';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
  type DetailJsonSection,
} from '../../../shared/ReadOnlyDetailDrawer';
import type { ${names.pascal}Record } from '../index';

export type ${names.pascal}DetailRecord = ${names.pascal}Record;

export type ${names.pascal}DetailProps = {
  record?: ${names.pascal}DetailRecord;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function renderGeneratedDetailValue(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildDetailFields(record: ${names.pascal}DetailRecord): DetailField[] {
  return [
${scalarDetailFields.map((field) => renderAdminDetailField(field)).join('\n')}
  ];
}

function buildDetailJsonSections(record: ${names.pascal}DetailRecord): DetailJsonSection[] {
  return [
${jsonDetailFields.map((field) => renderAdminJsonSection(field)).join('\n')}
  ];
}

export default function ${names.pascal}Detail({
  record,
  open,
  onOpenChange,
}: ${names.pascal}DetailProps) {
  if (!record) {
    return <Empty description="Select a generated record" />;
  }

  return (
    <ReadOnlyDetailDrawer
      fields={buildDetailFields(record)}
      jsonSections={buildDetailJsonSections(record)}
      onClose={() => onOpenChange?.(false)}
      open={Boolean(open)}
      title=${quoteString(schema.detail.title)}
    />
  );
}
`;
}

function renderAdminExportButtonContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const exportFields = getFieldsByName(
    schema,
    schema.export?.columns ?? schema.list.columns,
  );

  return `${markerComment}
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../../../shared/CurrentPageExportButton';
import type { ${names.pascal}Record } from '../index';

export const generated${names.pascal}ExportColumns: CurrentPageExportColumn<${names.pascal}Record>[] = [
${exportFields.map((field) => renderAdminExportColumn(field)).join('\n')}
];

export type ${names.pascal}ExportButtonProps = {
  columns?: readonly CurrentPageExportColumn<${names.pascal}Record>[];
  disabled?: boolean;
  resource?: string;
  rows: readonly ${names.pascal}Record[];
};

export default function ${names.pascal}ExportButton({
  columns = generated${names.pascal}ExportColumns,
  disabled = false,
  resource = ${quoteString(names.resource)},
  rows,
}: ${names.pascal}ExportButtonProps) {
  return (
    <CurrentPageExportButton<${names.pascal}Record>
      columns={columns}
      disabled={disabled}
      resource={resource}
      rows={rows}
    />
  );
}
`;
}

function renderAdminSmokeTestContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import {
  canUseGenerated${names.pascal}Action,
  generated${names.pascal}Permissions,
} from './index';

describe('${names.pascal} generated Admin skeleton', () => {
  it('maps operation permissions without registering routes automatically', () => {
    const generatedRoute = ${quoteString(schema.admin.basePath)};

    expect(generated${names.pascal}Permissions).toMatchObject({
${schema.actions
  .map((action) => {
    const permission = getPermissionForAction(schema, action);

    return permission ? `      ${action}: ${quoteString(permission)},` : '';
  })
  .filter(Boolean)
  .join('\n')}
    });
    expect(canUseGenerated${names.pascal}Action('read')).toBe(true);
    expect(generatedRoute).toBe(${quoteString(schema.admin.basePath)});
  });
});
`;
}

function renderSdkTypesContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const formFields = getFieldsByName(schema, schema.form.fields);
  const filterFields = getFieldsByName(schema, schema.filter?.fields ?? []);

  return `${markerComment}
export type ${names.pascal} = {
${renderTypeMembers(schema.fields)}
};

export type Create${names.pascal}Request = {
${renderTypeMembers(formFields)}
};

export type Update${names.pascal}Request = {
${renderTypeMembers(formFields, true)}
};

export type ${names.pascal}ListQuery = {
  page?: number;
  pageSize?: number;
${renderTypeMembers(filterFields, true)}
  sortBy?: ${schema.sort?.fields?.length ? schema.sort.fields.map((field) => quoteString(field)).join(' | ') : 'string'};
  sortDirection?: 'asc' | 'desc';
};

export type ${names.pascal}ListResponse = {
  items: ${names.pascal}[];
  total: number;
  page: number;
  pageSize: number;
};

export type ${names.pascal}ExportRequest = {
  columns?: readonly string[];
};

export type ${names.pascal}DeleteResult = {
  deleted: boolean;
};
`;
}

function renderSdkClientContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);
  const listPath = sdkListPath(schema);
  const exportPath = sdkExportPath(schema);
  const detailPath = sdkDetailPathTemplate(schema);

  return `${markerComment}
import type { SdkRequest } from '../rbac-client';
import type {
  Create${names.pascal}Request,
  ${names.pascal},
  ${names.pascal}DeleteResult,
  ${names.pascal}ExportRequest,
  ${names.pascal}ListQuery,
  ${names.pascal}ListResponse,
  Update${names.pascal}Request,
} from './${names.resource}-types';

type Token = string;
type ${names.pascal}Identity = ${fieldTypeScriptType(identityField)};

function withGeneratedQuery(path: \`/\${string}\`, query?: Record<string, unknown>): \`/\${string}\` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();

  return (queryString ? \`\${path}?\${queryString}\` : path) as \`/\${string}\`;
}

function ${names.camel}DetailPath(${identityField.name}: ${names.pascal}Identity): \`/\${string}\` {
  return ${quoteString(detailPath)}.replace(
    ${quoteString(`{${identityField.name}}`)},
    encodeURIComponent(String(${identityField.name})),
  ) as \`/\${string}\`;
}

export type ${names.pascal}Client = {
  list(token: Token, query?: ${names.pascal}ListQuery): Promise<${names.pascal}ListResponse>;
  get(token: Token, ${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal} | null>;
  create(token: Token, body: Create${names.pascal}Request): Promise<${names.pascal}>;
  update(token: Token, ${identityField.name}: ${names.pascal}Identity, body: Update${names.pascal}Request): Promise<${names.pascal}>;
  delete(token: Token, ${identityField.name}: ${names.pascal}Identity): Promise<${names.pascal}DeleteResult>;
  exportRows(token: Token, exportRequest?: ${names.pascal}ExportRequest): Promise<${names.pascal}[]>;
};

export function create${names.pascal}Client(request: SdkRequest): ${names.pascal}Client {
  return {
    list: (token, query) =>
      request<${names.pascal}ListResponse>(withGeneratedQuery(${quoteString(listPath)}, query), {
        token,
      }),
    get: (token, ${identityField.name}) =>
      request<${names.pascal} | null>(${names.camel}DetailPath(${identityField.name}), {
        token,
      }),
    create: (token, body) =>
      request<${names.pascal}>(${quoteString(listPath)}, {
        method: 'POST',
        body,
        token,
      }),
    update: (token, ${identityField.name}, body) =>
      request<${names.pascal}>(${names.camel}DetailPath(${identityField.name}), {
        method: 'PATCH',
        body,
        token,
      }),
    delete: (token, ${identityField.name}) =>
      request<${names.pascal}DeleteResult>(${names.camel}DetailPath(${identityField.name}), {
        method: 'DELETE',
        token,
      }),
    exportRows: (token, exportRequest) =>
      request<${names.pascal}[]>(withGeneratedQuery(${quoteString(exportPath)}, exportRequest), {
        token,
      }),
  };
}
`;
}

function renderSdkSpecContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const identityField = getIdentityField(schema);
  const markerComment = renderMarkerComment(marker);
  const listPath = sdkListPath(schema);
  const exportPath = sdkExportPath(schema);
  const detailPath = sdkDetailPathTemplate(schema);
  const identityExample = identityField.type === 'number' ? '1' : 'demo';
  const expectedDetailPath = detailPath.replace(
    `{${identityField.name}}`,
    encodeURIComponent(identityExample),
  );

  return `${markerComment}
import type { SdkRequest } from '../rbac-client';
import { create${names.pascal}Client } from './${names.resource}-client';

describe('create${names.pascal}Client', () => {
  it('uses generated OpenAPI paths through the SDK request wrapper', async () => {
    const calls: Array<{ path: string; method?: string; token?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({
        path,
        method: options?.method,
        token: options?.token,
      });
      return {} as never;
    };
    const client = create${names.pascal}Client(request);

    await client.list('token', { page: 2, pageSize: 20 });
    await client.exportRows('token', { columns: ${renderStringArray(schema.export?.columns ?? schema.list.columns)} });
    await client.create('token', {} as never);
    await client.update('token', ${identityField.type === 'number' ? identityExample : quoteString(identityExample)}, {} as never);
    await client.delete('token', ${identityField.type === 'number' ? identityExample : quoteString(identityExample)});

    expect(calls).toEqual([
      {
        path: ${quoteString(`${listPath}?page=2&pageSize=20`)},
        token: 'token',
      },
      {
        path: ${quoteString(
          `${exportPath}?columns=${encodeURIComponent((schema.export?.columns ?? schema.list.columns)[0] ?? '')}${(
            schema.export?.columns ?? schema.list.columns
          )
            .slice(1)
            .map((column) => `&columns=${encodeURIComponent(column)}`)
            .join('')}`,
        )},
        token: 'token',
      },
      {
        path: ${quoteString(listPath)},
        method: 'POST',
        token: 'token',
      },
      {
        path: ${quoteString(expectedDetailPath)},
        method: 'PATCH',
        token: 'token',
      },
      {
        path: ${quoteString(expectedDetailPath)},
        method: 'DELETE',
        token: 'token',
      },
    ]);
  });
});
`;
}

function renderSdkGeneratedIndexContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
export * from './${names.resource}-client';
export * from './${names.resource}-types';
`;
}

function renderModuleDocContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  return `${renderMarkdownMarker(marker)}

# ${schema.title}

Module: \`${schema.moduleCode}\`

Resource: \`${schema.resource}\`

Template version: \`${marker.templateVersion}\`

Schema hash: \`${marker.schemaHash}\`

## Fields

${renderFieldList(schema)}

## Actions

${schema.actions.map((action) => `- ${action}`).join('\n')}

## Permissions

${schema.permissions.map((permission) => `- \`${permission}\``).join('\n')}

## Generated Outputs

- NestJS API skeletons under \`apps/api/src/modules/generated\`.
- Admin skeletons under \`apps/admin/src/pages/Generated\`.
- SDK generated files under \`packages/sdk/src/generated\`.
- Patch plans under \`openforge-patches\`.

Do not paste secrets into generated documentation.
`;
}

function renderApiDocContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  return `${renderMarkdownMarker(marker)}

# ${schema.title} API

Module: \`${schema.moduleCode}\`

Template version: \`${marker.templateVersion}\`

Schema hash: \`${marker.schemaHash}\`

## OpenAPI Tags

${schema.openapi.tags.map((tag) => `- ${tag}`).join('\n')}

## Paths

${(schema.openapi.paths ?? []).map((path) => `- \`${path}\``).join('\n')}

## Permission Guard Expectations

${schema.permissions.map((permission) => `- \`${permission}\``).join('\n')}
`;
}

function renderAdminDocContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  return `${renderMarkdownMarker(marker)}

# ${schema.title} Admin

Route path: \`${schema.admin.basePath}\`

Menu key: \`${schema.admin.menuKey ?? 'manual-review'}\`

Template version: \`${marker.templateVersion}\`

Schema hash: \`${marker.schemaHash}\`

## Generated Admin Files

${(schema.admin.targetPaths ?? []).map((path) => `- \`${path}\``).join('\n')}

## Operation Permissions

${schema.actions
  .map((action) => {
    const permission = getPermissionForAction(schema, action);

    return permission ? `- ${action}: \`${permission}\`` : '';
  })
  .filter(Boolean)
  .join('\n')}
`;
}

function renderRunbookContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  return `${renderMarkdownMarker(marker)}

# ${schema.title} OpenForge Runbook

Template version: \`${marker.templateVersion}\`

Schema hash: \`${marker.schemaHash}\`

## Commands

\`\`\`bash
pnpm openforge:plan -- --schema <schema> --format json
pnpm openforge:diff -- --schema <schema> --format json
pnpm openforge:apply -- --schema <schema> --dry-run
pnpm openforge:apply -- --schema <schema> --yes
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
\`\`\`

## Manual Review

- Review API repository placeholder before app module registration.
- Review Admin route/access patch plans before changing route or access files.
- Review SDK root index patch before re-exporting generated SDK files.
- Review Prisma drafts manually; OpenForge does not write schema or migrations.
`;
}

function renderPatchReviewDocContent(
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  return `${renderMarkdownMarker(marker)}

# ${schema.title} Patch Review

Template version: \`${marker.templateVersion}\`

Schema hash: \`${marker.schemaHash}\`

## Patch Plans

- \`openforge-patches/app-module.patch.md\`
- \`openforge-patches/admin-route.patch.md\`
- \`openforge-patches/admin-access.patch.md\`
- \`openforge-patches/sdk-index.patch.md\`
- \`openforge-patches/module-registry.patch.md\`

## Review Rules

- Patch plans are review instructions, not automatic edits.
- Confirm permissions, routes and SDK exports before applying manual changes.
- Do not apply patches that introduce P4/P5 scope or secret-bearing content.
`;
}

function renderTypeScriptContent(
  kind: OpenForgeArtifactKind,
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);

  if (kind === 'api.dto') {
    return renderApiDtoContent(schema, marker);
  }

  if (kind === 'api.controller') {
    return renderApiControllerContent(schema, marker);
  }

  if (kind === 'api.module') {
    return renderApiModuleContent(schema, marker);
  }

  if (kind === 'api.service') {
    return renderApiServiceContent(schema, marker);
  }

  if (kind === 'api.repository') {
    return renderApiRepositoryContent(schema, marker);
  }

  if (kind === 'api.spec') {
    return renderApiSpecContent(schema, marker);
  }

  if (kind === 'admin.proTablePage') {
    return renderAdminPageContent(schema, marker);
  }

  if (kind === 'admin.modalForm') {
    return renderAdminFormContent(schema, marker, 'modal');
  }

  if (kind === 'admin.drawerForm') {
    return renderAdminFormContent(schema, marker, 'drawer');
  }

  if (kind === 'admin.descriptions' || kind === 'admin.detail') {
    return renderAdminDetailContent(schema, marker);
  }

  if (kind === 'admin.exportButton') {
    return renderAdminExportButtonContent(schema, marker);
  }

  if (kind === 'admin.smokeTest') {
    return renderAdminSmokeTestContent(schema, marker);
  }

  if (kind === 'sdk.types') {
    return renderSdkTypesContent(schema, marker);
  }

  if (kind === 'sdk.client') {
    return renderSdkClientContent(schema, marker);
  }

  if (kind === 'sdk.spec') {
    return renderSdkSpecContent(schema, marker);
  }

  if (kind === 'sdk.generated-index') {
    return renderSdkGeneratedIndexContent(schema, marker);
  }

  return `${markerComment}
export const generated${names.pascal} = {
  moduleCode: '${schema.moduleCode}',
  artifactKind: '${kind}',
};
`;
}

function renderMarkdownContent(
  kind: OpenForgeArtifactKind,
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
  patchOnly: boolean,
): string {
  const names = getNameParts(schema);

  if (kind === 'docs.module-doc') {
    return renderModuleDocContent(schema, marker);
  }

  if (kind === 'docs.api-doc') {
    return renderApiDocContent(schema, marker);
  }

  if (kind === 'docs.admin-doc') {
    return renderAdminDocContent(schema, marker);
  }

  if (kind === 'docs.runbook') {
    return renderRunbookContent(schema, marker);
  }

  if (kind === 'docs.patch-review') {
    return renderPatchReviewDocContent(schema, marker);
  }

  if (kind === 'patch.app-module') {
    return `${renderMarkdownMarker(marker)}

# API Module Registration Patch

Target human file: \`apps/api/src/app/app.module.ts\`

Generated module: \`${names.pascal}Module\`

Import to review:

\`\`\`ts
import { ${names.pascal}Module } from '../modules/generated/${names.layer}/${names.resource}/${names.resource}.module';
\`\`\`

Manual step:

Add \`${names.pascal}Module\` to the NestJS \`imports\` array after reviewing the generated controller, service, repository placeholder, DTOs and permissions.

Safety:

- OpenForge does not modify \`app.module.ts\` directly.
- The generated repository is a placeholder and must be replaced before production registration.
- Do not paste secrets into generated patch plans.
`;
  }

  if (kind === 'patch.admin-route') {
    return `${renderMarkdownMarker(marker)}

# Admin Route Patch

Target human file: \`apps/admin/config/routes.ts\`

Generated page component:

\`\`\`ts
{
  path: ${quoteString(schema.admin.basePath)},
  name: ${quoteString(schema.title)},
  component: ${quoteString(`./Generated/${names.pascal}`)},
}
\`\`\`

Safety:

- OpenForge does not modify \`config/routes.ts\` directly.
- Review route naming and menu placement before adding it by hand.
- Do not introduce generated demo routes into production menus without review.
`;
  }

  if (kind === 'patch.admin-access') {
    return `${renderMarkdownMarker(marker)}

# Admin Access Patch

Target human file: \`apps/admin/src/access.ts\`

Generated permissions:

${schema.permissions.map((permission) => `- \`${permission}\``).join('\n')}

Manual step:

Expose access helpers for the generated page only after confirming the route and permission mapping.

Safety:

- OpenForge does not modify \`access.ts\` directly.
- Operation buttons in generated Admin files are permission-aware placeholders.
`;
  }

  if (kind === 'patch.sdk-index') {
    return `${renderMarkdownMarker(marker)}

# SDK Index Patch

Target human file: \`packages/sdk/src/index.ts\`

Generated barrel file: \`packages/sdk/src/generated/index.ts\`

Manual export to review:

\`\`\`ts
export * from './generated';
\`\`\`

Safety:

- OpenForge does not modify the hand-written SDK root index directly.
- Keep generated SDK exports under \`packages/sdk/src/generated\`.
- Confirm OpenAPI paths before exposing generated SDK clients.
`;
  }

  return `${renderMarkdownMarker(marker)}

# ${schema.title} ${kind}

Module: \`${schema.moduleCode}\`

Resource: \`${schema.resource}\`

Patch only: ${patchOnly}

## Fields

${renderFieldList(schema)}

## Review

Generated by OpenForge for manual review. Do not paste secrets into generated docs.
`;
}

function renderArtifactContent(
  template: OpenForgeTemplateDefinition,
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): OpenForgeArtifactContent {
  if (
    template.artifactKind.startsWith('docs.') ||
    template.artifactKind.startsWith('patch.') ||
    template.artifactKind.startsWith('prisma.')
  ) {
    return {
      format: 'markdown',
      value: renderMarkdownContent(
        template.artifactKind,
        schema,
        marker,
        template.patchOnly,
      ),
    };
  }

  return {
    format: 'typescript',
    value: renderTypeScriptContent(template.artifactKind, schema, marker),
  };
}

function createVirtualFile(
  template: OpenForgeTemplateDefinition,
  schema: OpenForgeManualSchema,
  config: OpenForgeGeneratorConfig,
): OpenForgeVirtualFile {
  const targetPath = renderTargetPath(template, schema, config);
  const marker: OpenForgeGeneratedMarker = {
    signature: OPENFORGE_GENERATED_MARKER_SIGNATURE,
    templateVersion: config.templateVersion,
    schemaHash: createStableHash(schema),
    moduleCode: schema.moduleCode,
    artifactKind: template.artifactKind,
    generatedAt: OPENFORGE_DETERMINISTIC_TIMESTAMP,
  };
  const content = renderArtifactContent(template, schema, marker);
  const safety = evaluatePathSafety(targetPath);

  if (safety.blocked) {
    throw new Error(
      `OpenForge template ${template.id} rendered unsafe path ${targetPath}: ${safety.reason}`,
    );
  }

  return {
    targetPath,
    artifactKind: template.artifactKind,
    content,
    contentHash: createStableHash(content.value),
    marker,
    isGenerated: !template.patchOnly,
    isPatchOnly: template.patchOnly,
    reason: template.description,
  };
}

export function renderTemplatePack(
  schema: OpenForgeManualSchema,
  config: OpenForgeGeneratorConfig,
): OpenForgeVirtualFile[] {
  const allowedKinds = new Set(config.allowedArtifactKinds);
  const blockedKinds = new Set(config.blockedArtifactKinds);

  return OPENFORGE_DEFAULT_TEMPLATE_PACK.templates
    .filter(
      (template) =>
        allowedKinds.has(template.artifactKind) &&
        !blockedKinds.has(template.artifactKind),
    )
    .map((template) => createVirtualFile(template, schema, config))
    .sort((left, right) => left.targetPath.localeCompare(right.targetPath));
}
