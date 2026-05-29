import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Normalises every thrown error into RFC 7807 problem-details JSON:
 *
 *   { type, title, status, detail, instance, requestId, errors? }
 *
 * The exact shape stays stable across runtime, validation, and unknown errors,
 * which lets the frontend render a single error component for any 4xx/5xx.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal server error';
    let detail: string | undefined;
    let errors: unknown;

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Validation failed';
      errors = exception.flatten();
      detail = exception.issues[0]?.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        title = r;
      } else if (typeof r === 'object' && r !== null) {
        const rec = r as Record<string, unknown>;
        title = (rec.error as string) ?? exception.name;
        detail =
          typeof rec.message === 'string'
            ? rec.message
            : Array.isArray(rec.message)
              ? (rec.message as string[]).join('; ')
              : undefined;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    if (status >= 500) {
      this.log.error(
        `[${req.id}] ${req.method} ${req.url} → ${status} ${title}: ${detail ?? ''}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({
      type: `about:blank`,
      title,
      status,
      detail,
      instance: req.url,
      requestId: req.id,
      ...(errors ? { errors } : {}),
    });
  }
}
