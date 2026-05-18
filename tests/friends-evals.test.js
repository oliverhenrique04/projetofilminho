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

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('friend can view evaluations', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-evals-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3112, dbPath });
  try {
    const u1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_c', email: 'c@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    const u2 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_d', email: 'd@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });

    const solicit = await postJson(baseUrl + '/api/amigos/solicitar', { de_id: u1.data.id, para_id: u2.data.id });
    await postJson(baseUrl + '/api/amigos/aceitar', { solicitacao_id: solicit.data.id, usuario_id: u2.data.id });

    await postJson(baseUrl + '/api/avaliar', {
      id_usuario: u1.data.id,
      id_filme: 123,
      titulo_filme: 'Filme X',
      nota: 4.5,
      poster_path: '/x.jpg',
      reassistido: false,
      foto: null,
      localizacao: null,
    });

    const { res, data } = await getJson(baseUrl + '/api/amigos/' + u1.data.id + '/avaliacoes?usuario_id=' + u2.data.id);
    assert.equal(res.status, 200);
    assert.equal(data.length, 1);
    assert.equal(data[0].titulo_filme, 'Filme X');
  } finally {
    stopServer(child);
  }
});

test('non-friend cannot view evaluations', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-evals2-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3113, dbPath });
  try {
    const u1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_e', email: 'e@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    const u2 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_f', email: 'f@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });

    const { res } = await getJson(baseUrl + '/api/amigos/' + u1.data.id + '/avaliacoes?usuario_id=' + u2.data.id);
    assert.equal(res.status, 403);
  } finally {
    stopServer(child);
  }
});
