/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health/live', 'health/ready'],
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle('OpenCore API')
    .setDescription('OpenCore API contract')
    .setVersion('0.0.0')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, openApiDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`Health live endpoint: http://localhost:${port}/health/live`);
  Logger.log(`Health ready endpoint: http://localhost:${port}/health/ready`);
  Logger.log(`OpenAPI docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
