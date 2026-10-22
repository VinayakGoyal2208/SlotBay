import { test } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createVercelApp } from '../vercel.js';

test('public pages render without database settings while API requests stay protected', async () => {
  process.env.NODE_ENV = 'production';
  process.env.VERCEL = '1';
  process.env.SITE_URL = 'https://slotbay.example.test';
  delete process.env.MONGO_URI;
  delete process.env.DATA_ENCRYPTION_KEY;
  const app = createVercelApp();
  for (const url of ['/', '/how-it-works', '/for-owners', '/auth']) {
    const response = await supertest(app).get(url);
    assert.equal(response.status, 200, url);
    assert.match(response.text, /id="root"/);
    assert.match(response.headers['cache-control'], /no-store/);
  }
  assert.equal((await supertest(app).get('/missing-page')).status, 404);
  assert.equal((await supertest(app).get('/api/v1/auth/session')).status, 503);
  assert.equal((await supertest(app).get('/slot/missing')).status, 503);
});
