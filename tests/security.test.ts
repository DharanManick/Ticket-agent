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
