const test = require('node:test');
const assert = require('node:assert/strict');
const { createPushClient } = require('../backend/firebase-admin');

test('push client skips send when firebase credentials are absent', async () => {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const client = createPushClient();
  const result = await client.sendToTokens({
    tokens: ['token-1'],
    notification: { title: 'Teste', body: 'Mensagem' },
    data: { rota: 'notificacoes' },
  });

  assert.deepEqual(result, {
    ok: false,
    skipped: true,
    reason: 'missing-config',
    sentCount: 0,
    failureCount: 1,
  });
});
