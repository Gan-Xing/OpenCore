import {
  OPENFORGE_GENERATED_MARKER_SIGNATURE,
  formatOpenForgeGeneratedMarker,
  type OpenForgeArtifactContent,
  type OpenForgeArtifactKind,
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
    return `${markerComment}
import { ApiProperty } from '@nestjs/swagger';

export class ${names.pascal}Dto {
${schema.fields
  .map(
    (field) => `  @ApiProperty({ required: ${Boolean(field.required)} })
  ${field.name}!: ${field.type === 'number' ? 'number' : field.type === 'boolean' ? 'boolean' : 'string'};`,
  )
  .join('\n\n')}
}
`;
  }

  if (kind === 'api.controller') {
    return `${markerComment}
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

const REQUIRED_PERMISSIONS = [${permissions}] as const;

@ApiTags('${schema.openapi.tags[0] ?? schema.title}')
@Controller('generated/${names.layer}/${names.resource}')
export class ${names.pascal}Controller {
  @Get()
  list${names.pascal}() {
    return { resource: '${names.resource}', permissions: REQUIRED_PERMISSIONS };
  }
}
`;
  }

  if (kind === 'api.module') {
    return `${markerComment}
import { Module } from '@nestjs/common';
import { ${names.pascal}Controller } from './${names.resource}.controller';
import { ${names.pascal}Service } from './${names.resource}.service';

@Module({
  controllers: [${names.pascal}Controller],
  providers: [${names.pascal}Service],
})
export class ${names.pascal}Module {}
`;
  }

  if (kind === 'api.service') {
    return `${markerComment}
export class ${names.pascal}Service {
  readonly resource = '${names.resource}';
}
`;
  }

  if (kind === 'api.repository') {
    return `${markerComment}
export type ${names.pascal}Repository = {
  readonly resource: '${names.resource}';
};
`;
  }

  if (kind === 'api.spec') {
    return `${markerComment}
describe('${names.pascal} generated API skeleton', () => {
  it('declares the generated resource', () => {
    expect('${names.resource}').toBe('${names.resource}');
  });
});
`;
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
