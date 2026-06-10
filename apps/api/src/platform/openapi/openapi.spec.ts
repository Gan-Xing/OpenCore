import { Test } from '@nestjs/testing';
import { AppModule } from '../../app/app.module';
import { loadRuntimeConfig } from '../config/runtime-config';
import { applyApiFoundation } from '../setup/apply-api-foundation';
import { createOpenApiDocument } from './openapi';

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

    await app.close();
  });
});
