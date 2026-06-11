const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

test('backend serves API and static app under /filminho', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-base-path-' + Date.now() + '.json');
  fs.writeFileSync(dbPath, JSON.stringify({
    usuarios: [],
    avaliacoes: [],
    solicitacoes_amizade: [],
    amizades: [],
    notificacoes: [],
    dispositivos_push: [],
  }, null, 2));

  const { child, baseUrl } = await startServer({
    port: 3137,
    dbPath,
    extraEnv: { APP_BASE_PATH: '/filminho' },
  });

  try {
    const apiResponse = await fetch(baseUrl + '/filminho/api/filmes/tendencias');
    assert.equal(apiResponse.status, 200);

    const appResponse = await fetch(baseUrl + '/filminho/');
    assert.equal(appResponse.status, 200);
  } finally {
    stopServer(child);
  }
});
