import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { listModules } from '@opencore/module-registry';

export type OpenApiSetupConfig = {
  swaggerEnabled: boolean;
  swaggerPath: string;
};

export function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('OpenCore API')
    .setDescription('OpenCore API contract')
    .setVersion('0.0.0')
    .addServer('/')
    .build();
}

export function createOpenApiDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, createOpenApiConfig());
  const registryTags = listModules().flatMap((moduleDefinition) =>
    moduleDefinition.apiTags.map((name) => ({
      name,
      description: `${moduleDefinition.code}: ${moduleDefinition.title}`,
    })),
  );
  const existingTags = new Map(
    (document.tags ?? []).map((tag) => [tag.name, tag]),
  );

  for (const tag of registryTags) {
    existingTags.set(tag.name, tag);
  }

  return {
    ...document,
    tags: [...existingTags.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  };
}

export function setupOpenApi(
  app: INestApplication,
  config: OpenApiSetupConfig,
): void {
  if (!config.swaggerEnabled) {
    return;
  }

  SwaggerModule.setup(config.swaggerPath, app, createOpenApiDocument(app));
}
