const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('logs in demo user', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-login-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3106, dbPath });
  try {
    const { res, data } = await postJson(baseUrl + '/api/auth/login', {
      email: 'admin@email',
      senha: '123456',
    });
    assert.equal(res.status, 200);
    assert.equal(data.email, 'admin@email');
    assert.equal(data.id, 1);
  } finally {
    stopServer(child);
  }
});

test('rejects wrong password', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-login2-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3107, dbPath });
  try {
    const { res } = await postJson(baseUrl + '/api/auth/login', {
      email: 'admin@email',
      senha: 'wrongpassword',
    });
    assert.equal(res.status, 401);
  } finally {
    stopServer(child);
  }
});

test('rejects non-existent email', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-login3-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3108, dbPath });
  try {
    const { res } = await postJson(baseUrl + '/api/auth/login', {
      email: 'nobody@test.com',
      senha: '123456',
    });
    assert.equal(res.status, 401);
  } finally {
    stopServer(child);
  }
});
