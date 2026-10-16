import express from 'express';

export interface RequestWithTrace extends express.Request {
  traceId?: string;
  _startTime?: number;
}

/**
 * Generates or propagates a unique Request Trace ID for every incoming HTTP request.
 * Sets X-Request-Id header on response and tracks response duration in X-Response-Time.
 */
export function traceMiddleware(req: RequestWithTrace, res: express.Response, next: express.NextFunction) {
  const incomingId = req.headers['x-request-id'];
  const traceId = typeof incomingId === 'string' && incomingId.trim() !== ''
    ? incomingId.trim()
    : `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  req.traceId = traceId;
  req._startTime = Date.now();
  res.setHeader('X-Request-Id', traceId);

  // Intercept writeHead to set X-Response-Time before headers are flushed to the client
  const originalWriteHead = res.writeHead;
  res.writeHead = function (this: express.Response, ...args: any[]) {
    if (req._startTime && !this.headersSent) {
      const duration = Date.now() - req._startTime;
      try {
        this.setHeader('X-Response-Time', `${duration}ms`);
      } catch {
        // Ignored if headers were already committed
      }
    }
    return originalWriteHead.apply(this, args as any);
  };

  next();
}

/**
 * Cross-Origin Resource Sharing (CORS) middleware for browser UI compatibility.
 */
export function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, X-Response-Time');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * JSON 404 handler for unmatched /api routes to prevent HTML error responses in UI clients.
 */
export function apiNotFoundHandler(req: RequestWithTrace, res: express.Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
      traceId: req.traceId || 'unknown'
    }
  });
}

/**
 * Centralized error handling middleware ensuring consistent JSON error structures.
 */
export function apiErrorHandler(
  err: any,
  req: RequestWithTrace,
  res: express.Response,
  next: express.NextFunction
) {
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = err.message || 'An unexpected internal error occurred.';
  const traceId = req.traceId || 'unknown';

  console.error(`[API Error ${status}][${traceId}] ${req.method} ${req.url}:`, err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    error: {
      code: err.code || (status === 400 ? 'BAD_REQUEST' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message,
      traceId
    }
  });
}
