import { NextFunction, Request, Response } from 'express';

export function securityHeadersMiddleware(request: Request, response: Response, next: NextFunction): void {
  const isDocs = request.originalUrl.includes('/docs');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-XSS-Protection', '0');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', isDocs ? 'cross-origin' : 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.setHeader(
    'Content-Security-Policy',
    isDocs
      ? "default-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'"
      : "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  );
  next();
}
