import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Security (SEC-01): No live Google API key in .env.example', () => {
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  const content = fs.readFileSync(envExamplePath, 'utf8');

  // Must not contain known compromised or live key
  assert.strictEqual(content.includes('AIzaSyBOkaS9x62PF'), false, 'Live key found in .env.example');
  // Must use placeholder
  assert.ok(content.includes('your-gemini-api-key') || content.includes('YOUR_GEMINI_API_KEY'), 'Missing placeholder in .env.example');
});

test('Security (SEC-01): No hardcoded live key in server.ts default fallbacks', () => {
  const serverPath = path.resolve(process.cwd(), 'server.ts');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert.strictEqual(content.includes('AIzaSyBOkaS9x62PF'), false, 'Hardcoded live key found in server.ts');
});

test('Security (SEC-03): Global NODE_TLS_REJECT_UNAUTHORIZED is not disabled in server.ts', () => {
  const serverPath = path.resolve(process.cwd(), 'server.ts');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert.strictEqual(
    content.includes("process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'") ||
    content.includes('process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"'),
    false,
    'Global TLS verification must not be disabled via NODE_TLS_REJECT_UNAUTHORIZED = 0'
  );
  assert.notStrictEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0');
});

test('Security (SEC-02): isBlockedSsrfUrl blocks SSRF, private IPs, loopback, and metadata endpoints', async () => {
  const { isBlockedSsrfUrl } = await import('../lib/security');

  // Loopback and Localhost
  assert.strictEqual(isBlockedSsrfUrl('http://localhost:3000/webhook').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('http://127.0.0.1:8080/test').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('http://[::1]:8080/').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('http://0.0.0.0/').blocked, true);

  // Cloud Instance Metadata (AWS/GCP/Azure)
  assert.strictEqual(isBlockedSsrfUrl('http://169.254.169.254/latest/meta-data/').blocked, true);

  // Private RFC 1918 Subnets
  assert.strictEqual(isBlockedSsrfUrl('http://10.0.0.1/admin').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('http://172.16.50.4/internal').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('http://192.168.1.1/router').blocked, true);

  // Non-HTTP/HTTPS Protocols
  assert.strictEqual(isBlockedSsrfUrl('file:///etc/passwd').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('ftp://internal-server/data').blocked, true);
  assert.strictEqual(isBlockedSsrfUrl('gopher://127.0.0.1:70/').blocked, true);

  // Obfuscated / integer IPs
  assert.strictEqual(isBlockedSsrfUrl('http://2130706433/').blocked, true); // 127.0.0.1 in dword

  // Valid external public HTTPS endpoints
  assert.strictEqual(isBlockedSsrfUrl('https://webhook.office.com/webhookb2/guid/IncomingWebhook').blocked, false);
  assert.strictEqual(isBlockedSsrfUrl('https://api.example.com/alerts/v1').blocked, false);
});


