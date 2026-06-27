import { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

type RequestWithId = Request & { requestId?: string };

function safeRequestId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^[a-zA-Z0-9_.:-]{8,80}$/.test(value)) return null;
  return value;
}

export function requestContextMiddleware(request: RequestWithId, response: Response, next: NextFunction): void {
  const inboundId = safeRequestId(request.headers[REQUEST_ID_HEADER]);
  const requestId = inboundId ?? crypto.randomUUID();
  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
