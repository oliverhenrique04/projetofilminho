# Backend Docker em /filminho Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o backend do Filminho em `https://nuted-ia.dev/filminho`, ajustar o app para usar `https://nuted-ia.dev/filminho/api` como URL padrão fixa e documentar o deploy em Docker.

**Architecture:** O backend Express passará a aceitar um `APP_BASE_PATH` configurável, montando API e assets sob `/filminho`. O frontend usará uma URL pública fixa para a API. O deploy será empacotado com `Dockerfile`, `docker-compose.yml` e configuração de proxy reverso versionada no repositório.

**Tech Stack:** Node.js, Express, dotenv, Docker, Docker Compose, Apache Cordova, Framework7, node:test.

---

### Task 1: Cobrir prefixo `/filminho` e URL pública por testes

**Files:**
- Modify: `tests/ui-notifications.test.js`
- Modify: `tests/db-path.test.js`
- Create: `tests/backend-base-path.test.js`
- Create: `tests/docker-config.test.js`

- [ ] **Step 1: Write the failing backend base-path test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

test('backend serves API and static app under /filminho', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-base-path-' + Date.now() + '.json');
  fs.writeFileSync(dbPath, JSON.stringify({
    usuarios: [], avaliacoes: [], solicitacoes_amizade: [], amizades: [], notificacoes: [], dispositivos_push: []
  }, null, 2));

  const { child, baseUrl } = await startServer({
    port: 3137,
    dbPath,
    extraEnv: { APP_BASE_PATH: '/filminho' },
  });

  try {
    const health = await fetch(baseUrl + '/filminho/api/filmes/tendencias');
    assert.equal(health.status, 200);

    const appPage = await fetch(baseUrl + '/filminho/');
    assert.equal(appPage.status, 200);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/backend-base-path.test.js`
Expected: FAIL because `startServer` cannot pass `APP_BASE_PATH` yet or backend still serves under `/api`.

- [ ] **Step 3: Write the failing frontend/public URL tests**

```js
assert.match(appJs, /https:\/\/nuted-ia\.dev\/filminho\/api/);
assert.doesNotMatch(appJs, /var API_URL = BASE_URL \+ '\/api';/);
```

```js
assert.ok(fs.existsSync(path.join(__dirname, '../Dockerfile')));
assert.ok(fs.existsSync(path.join(__dirname, '../docker-compose.yml')));
```

- [ ] **Step 4: Run test to verify they fail**

Run: `node --test tests/ui-notifications.test.js tests/docker-config.test.js`
Expected: FAIL because app still uses local inference and Docker files do not exist yet.

- [ ] **Step 5: Commit**

```bash
git add tests/backend-base-path.test.js tests/docker-config.test.js tests/ui-notifications.test.js tests/db-path.test.js
git commit -m "test: cover filminho base path deploy"
```

### Task 2: Implement base path support in backend and test helpers

**Files:**
- Modify: `backend/server.js`
- Modify: `tests/helpers/test-server.js`
- Test: `tests/backend-base-path.test.js`
- Test: `tests/db-path.test.js`

- [ ] **Step 1: Implement configurable base path bootstrap**

```js
const APP_BASE_PATH = (process.env.APP_BASE_PATH || '/filminho').replace(/\/$/, '');
const API_BASE_PATH = APP_BASE_PATH + '/api';

app.use(APP_BASE_PATH, express.static(path.join(__dirname, '../www')));
app.get(APP_BASE_PATH + '/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/index.html'));
});
```

Then change all backend route registrations from `'/api/...` to `API_BASE_PATH + '/...'`.

- [ ] **Step 2: Extend the test helper to inject extra environment variables**

```js
async function startServer({ port, dbPath, extraEnv } = {}) {
  const env = { ...process.env, ...(extraEnv || {}) };
  if (port) env.PORT = String(port);
  if (dbPath) env.FILMINHO_DB = dbPath;
  // spawn logic unchanged
}
```

- [ ] **Step 3: Run targeted tests to verify they pass**

Run: `node --test tests/backend-base-path.test.js tests/db-path.test.js`
Expected: PASS.

- [ ] **Step 4: Refactor only if needed to avoid duplicated base path string building**

```js
function withApi(pathname) {
  return API_BASE_PATH + pathname;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/server.js tests/helpers/test-server.js tests/backend-base-path.test.js tests/db-path.test.js
git commit -m "feat: support filminho base path in backend"
```

### Task 3: Point the app to the public backend URL

**Files:**
- Modify: `www/js/app.js`
- Modify: `tests/ui-notifications.test.js`
- Test: `tests/ui-notifications.test.js`

- [ ] **Step 1: Replace inferred API URL with fixed public URL**

```js
var API_URL = 'https://nuted-ia.dev/filminho/api';
```

Remove the dynamic `BASE_URL` inference block if no longer used.

- [ ] **Step 2: Run UI config test**

Run: `node --test tests/ui-notifications.test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add www/js/app.js tests/ui-notifications.test.js
git commit -m "feat: point app to hosted filminho backend"
```

### Task 4: Add Docker and proxy deploy assets

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Create: `deploy/nginx/filminho.conf`
- Create: `tests/docker-config.test.js`
- Test: `tests/docker-config.test.js`

- [ ] **Step 1: Create Dockerfile for production backend**

```dockerfile
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY backend ./backend
COPY www ./www
COPY .env.example ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "backend/server.js"]
```

- [ ] **Step 2: Create docker-compose.yml with volume and env wiring**

```yaml
services:
  filminho-backend:
    build: .
    container_name: filminho-backend
    env_file:
      - .env
    environment:
      APP_BASE_PATH: /filminho
      PORT: 3000
      FILMINHO_DB: /data/banco_filminho.json
    volumes:
      - ./backend:/app/backend
      - ./www:/app/www
      - filminho_data:/data
      - /home/mrosa/.secrets:/home/mrosa/.secrets:ro
    ports:
      - "3000:3000"
volumes:
  filminho_data:
```

- [ ] **Step 3: Create proxy config for `nuted-ia.dev`**

```nginx
location /filminho/ {
    proxy_pass http://127.0.0.1:3000/filminho/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

- [ ] **Step 4: Run Docker config tests**

Run: `node --test tests/docker-config.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml deploy/nginx/filminho.conf tests/docker-config.test.js
git commit -m "chore: add docker deploy for filminho backend"
```

### Task 5: Update docs and verify end to end

**Files:**
- Modify: `README.md`
- Modify: `docs/firebase-setup.md`
- Test: `npm test`
- Test: `docker compose config`

- [ ] **Step 1: Document hosted backend usage**

Add to README:

```md
## Backend hospedado

Backend público: `https://nuted-ia.dev/filminho`
API pública: `https://nuted-ia.dev/filminho/api`

Subida local com Docker:

```bash
docker compose up --build -d
```
```

- [ ] **Step 2: Document required env vars for Docker/Firebase**

Add to docs:

```md
- `APP_BASE_PATH=/filminho`
- `APP_PUBLIC_API_URL=https://nuted-ia.dev/filminho/api`
- `GOOGLE_APPLICATION_CREDENTIALS` deve apontar para o JSON montado no container
```

- [ ] **Step 3: Run full verification**

Run: `npm test`
Expected: PASS with all tests green.

Run: `docker compose config`
Expected: exit code 0 and rendered compose output.

- [ ] **Step 4: Optional smoke test if Docker is available**

Run: `docker compose up --build -d && curl -I https://nuted-ia.dev/filminho || curl -I http://localhost:3000/filminho/`
Expected: `HTTP 200` for the local container route if remote DNS/proxy is not available in this environment.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/firebase-setup.md
git commit -m "docs: explain filminho docker deploy"
```
