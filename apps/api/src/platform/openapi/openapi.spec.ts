import { Test } from '@nestjs/testing';
import { applyApiFoundation, createOpenApiDocument } from '@opencore/core';
import { AppModule } from '../../app/app.module';
import { loadRuntimeConfig } from '../config/runtime-config';

describe('OpenAPI baseline', () => {
  it('exports health endpoints from a configured API app', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();

    applyApiFoundation(
      app,
      loadRuntimeConfig({
        NODE_ENV: 'test',
      }),
    );
    await app.init();

    const document = createOpenApiDocument(app);

    expect(document.info.title).toBe('OpenCore API');
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/health/live', '/health/ready']),
    );
    expect(document.components?.schemas?.ApiErrorResponse).toMatchObject({
      type: 'object',
      required: ['success', 'error'],
    });
    expect(document.components?.schemas?.ApiErrorDetail).toMatchObject({
      required: ['code', 'message', 'statusCode', 'timestamp'],
    });

    await app.close();
  });
});
