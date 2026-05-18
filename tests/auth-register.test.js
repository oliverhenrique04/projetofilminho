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

test('registers user with unique name/email', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-reg-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3102, dbPath });
  try {
    const payload = {
      nome: 'joao_teste',
      email: 'joao@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    };
    const { res, data } = await postJson(baseUrl + '/api/auth/registro', payload);
    assert.equal(res.status, 201);
    assert.equal(data.nome, 'joao_teste');
    assert.equal(data.email, 'joao@test.com');
    assert.ok(data.id);
  } finally {
    stopServer(child);
  }
});

test('rejects duplicate email', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-reg2-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3103, dbPath });
  try {
    const p1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'maria_teste', email: 'maria2@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    const p2 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'maria_teste2', email: 'maria2@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    assert.equal(p2.res.status, 409);
  } finally {
    stopServer(child);
  }
});

test('rejects duplicate name', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-reg3-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3104, dbPath });
  try {
    const p1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'carlos_teste', email: 'carlos1@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    const p2 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'carlos_teste', email: 'carlos2@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    assert.equal(p2.res.status, 409);
  } finally {
    stopServer(child);
  }
});

test('rejects short password', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-reg4-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3105, dbPath });
  try {
    const { res } = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'teste_curto', email: 'curto@test.com', senha: '12345', cep: '01001000', consentimento_lgpd: true,
    });
    assert.equal(res.status, 400);
  } finally {
    stopServer(child);
  }
});
