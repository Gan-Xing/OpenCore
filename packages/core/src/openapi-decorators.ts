import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiStandardErrorResponses(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 404, description: 'Not found' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}

export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              $ref: getSchemaPath(model),
            },
          },
          page: { type: 'number' },
          pageSize: { type: 'number' },
          total: { type: 'number' },
          totalPages: { type: 'number' },
        },
        required: ['items', 'page', 'pageSize', 'total', 'totalPages'],
      },
    }),
  );
}
