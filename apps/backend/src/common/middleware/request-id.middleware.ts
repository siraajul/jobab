import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Stamps every request with an x-request-id (honoured if the caller supplies
 * one, generated otherwise). The same id flows through the Pino logger and
 * the exception filter so a single line in the response body or a server log
 * is enough to find the full request trace.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const id =
      (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    (req as Request & { id: string }).id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
