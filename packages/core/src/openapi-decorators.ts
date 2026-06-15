import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiStandardErrorResponses(): MethodDecorator & ClassDecorator {
  const schema = {
    $ref: '#/components/schemas/ApiErrorResponse',
  };

  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad request', schema }),
    ApiResponse({ status: 401, description: 'Unauthorized', schema }),
    ApiResponse({ status: 403, description: 'Forbidden', schema }),
    ApiResponse({ status: 404, description: 'Not found', schema }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      schema,
    }),
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
