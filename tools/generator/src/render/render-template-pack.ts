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
  const markerComment = renderMarkerComment(marker);

  return `${markerComment}
import { ${names.pascal}Controller } from './${names.resource}.controller';
import { Generated${names.pascal}Repository } from './${names.resource}.repository';
import { ${names.pascal}Service } from './${names.resource}.service';

describe('${names.pascal} generated API skeleton', () => {
  it('wires the controller to the generated service contract', () => {
    const repository = new Generated${names.pascal}Repository();
    const service = new ${names.pascal}Service(repository);
    const controller = new ${names.pascal}Controller(service);

    expect(controller).toBeDefined();
    expect(service.resource).toBe(${quoteString(names.resource)});
  });
});
`;
}

function renderTypeScriptContent(
  kind: OpenForgeArtifactKind,
  schema: OpenForgeManualSchema,
  marker: OpenForgeGeneratedMarker,
): string {
  const names = getNameParts(schema);
  const markerComment = renderMarkerComment(marker);
  const permissions = schema.permissions
    .map((permission) => `'${permission}'`)
    .join(', ');

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

  if (kind.startsWith('admin.')) {
    return `${markerComment}
export default function Generated${names.pascal}() {
  return null;
}

export const generated${names.pascal}Meta = {
  title: '${schema.title}',
  basePath: '${schema.admin.basePath}',
  permissions: [${permissions}],
};
`;
  }

  if (kind.startsWith('sdk.')) {
    return `${markerComment}
export const ${names.camel}GeneratedClient = {
  resource: '${names.resource}',
  moduleCode: '${schema.moduleCode}',
};
`;
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
