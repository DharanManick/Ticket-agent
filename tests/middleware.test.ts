import test from 'node:test';
import assert from 'node:assert';
import { traceMiddleware, corsMiddleware, apiNotFoundHandler, apiErrorHandler } from '../lib/middleware';

test('Middleware (OBS-01): traceMiddleware generates traceId and sets headers', () => {
  const req: any = { headers: {} };
  const headersSet: Record<string, string> = {};
  const res: any = {
    setHeader: (key: string, val: string) => {
      headersSet[key.toLowerCase()] = val;
    },
    on: (_event: string, _callback: Function) => {}
  };

  traceMiddleware(req, res, () => {});

  assert.ok(req.traceId, 'Request must have traceId attached');
  assert.ok(req.traceId.startsWith('req_'), 'Generated traceId should start with req_');
  assert.strictEqual(headersSet['x-request-id'], req.traceId);
});

test('Middleware (OBS-01): traceMiddleware propagates incoming X-Request-Id', () => {
  const incoming = 'client-trace-12345';
  const req: any = { headers: { 'x-request-id': incoming } };
  const headersSet: Record<string, string> = {};
  const res: any = {
    setHeader: (key: string, val: string) => {
      headersSet[key.toLowerCase()] = val;
    },
    on: () => {}
  };

  traceMiddleware(req, res, () => {});

  assert.strictEqual(req.traceId, incoming);
  assert.strictEqual(headersSet['x-request-id'], incoming);
});

test('Middleware (OBS-01): corsMiddleware sets CORS headers and handles preflight', () => {
  const req: any = { method: 'OPTIONS' };
  const headersSet: Record<string, string> = {};
  let statusSent = 0;
  const res: any = {
    setHeader: (key: string, val: string) => {
      headersSet[key.toLowerCase()] = val;
    },
    sendStatus: (code: number) => {
      statusSent = code;
    }
  };

  corsMiddleware(req, res, () => {});

  assert.strictEqual(headersSet['access-control-allow-origin'], '*');
  assert.ok(headersSet['access-control-allow-methods'].includes('GET'));
  assert.ok(headersSet['access-control-allow-headers'].includes('X-Request-Id'));
  assert.strictEqual(statusSent, 204, 'Preflight OPTIONS should return 204');
});

test('Middleware (REL-01): apiNotFoundHandler returns structured JSON error', () => {
  const req: any = { method: 'GET', originalUrl: '/api/unknown-endpoint', traceId: 'trace-test-404' };
  let statusCode = 0;
  let jsonBody: any = null;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (body: any) => { jsonBody = body; }
      };
    }
  };

  apiNotFoundHandler(req, res);

  assert.strictEqual(statusCode, 404);
  assert.strictEqual(jsonBody?.error?.code, 'NOT_FOUND');
  assert.strictEqual(jsonBody?.error?.traceId, 'trace-test-404');
  assert.ok(jsonBody?.error?.message.includes('/api/unknown-endpoint'));
});

test('Middleware (REL-01): apiErrorHandler formats unexpected errors into consistent JSON schema', () => {
  const err = new Error('Database connection failed');
  const req: any = { method: 'POST', url: '/api/audit', traceId: 'trace-test-500' };
  let statusCode = 0;
  let jsonBody: any = null;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (body: any) => { jsonBody = body; }
      };
    }
  };

  apiErrorHandler(err, req, res, () => {});

  assert.strictEqual(statusCode, 500);
  assert.strictEqual(jsonBody?.error?.code, 'INTERNAL_SERVER_ERROR');
  assert.strictEqual(jsonBody?.error?.message, 'Database connection failed');
  assert.strictEqual(jsonBody?.error?.traceId, 'trace-test-500');
});
