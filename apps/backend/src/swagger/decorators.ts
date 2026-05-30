/**
 * Reusable Swagger decorators that DRY up controller boilerplate.
 *
 * Why these exist:
 *  - every endpoint needs cookie auth → one `@ApiAuthCookie()`
 *  - every endpoint can 401 / 403 / 422 → one `@ApiAuthErrors()`
 *  - request / response bodies map to schemas registered in `zod-registry.ts` →
 *    one `@ApiZodBody('Name')` / `@ApiZodOk('Name')` per call
 *
 * The goal: a new contributor decorates an endpoint in 3-5 lines, not 30.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const arrayRef = (name: string) => ({ type: 'array' as const, items: ref(name) });
const errorRef = () => ref('ApiError');

/** Session cookie auth — applies to every protected endpoint. */
export const ApiAuthCookie = () => ApiCookieAuth('session');

/**
 * 401 + 403 + 422 — the three errors every protected endpoint can return.
 *   401: no/expired session
 *   403: session valid but wrong org / role
 *   422: request body failed Zod validation
 */
export const ApiAuthErrors = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Missing or expired session cookie.',
      schema: errorRef(),
    }),
    ApiForbiddenResponse({
      description: 'Authenticated but not allowed (wrong org / role).',
      schema: errorRef(),
    }),
    ApiUnprocessableEntityResponse({
      description: 'Request body failed schema validation.',
      schema: errorRef(),
    }),
  );

export const ApiNotFound = (entity = 'Resource') =>
  ApiNotFoundResponse({
    description: `${entity} not found, or not visible to your org.`,
    schema: errorRef(),
  });

export const ApiBadRequest = (description = 'Malformed request.') =>
  ApiBadRequestResponse({ description, schema: errorRef() });

/** Request body referenced from `components/schemas/<name>`. */
export const ApiZodBody = (name: string, description?: string) =>
  ApiBody({ schema: ref(name), description });

/** 200 OK with a single object response. */
export const ApiZodOk = (name: string, description = 'Success.') =>
  ApiOkResponse({ description, schema: ref(name) });

/** 200 OK with an array response. */
export const ApiZodOkArray = (name: string, description = 'Success.') =>
  ApiOkResponse({ description, schema: arrayRef(name) });

/** 201 Created with a single object response. */
export const ApiZodCreated = (name: string, description = 'Created.') =>
  ApiCreatedResponse({ description, schema: ref(name) });

/** 200 OK with an inline shape — use sparingly, prefer registered schemas. */
export const ApiInlineOk = (description: string, example: unknown) =>
  ApiOkResponse({
    description,
    schema: {
      type: 'object',
      example: example as Record<string, unknown>,
    },
  });
