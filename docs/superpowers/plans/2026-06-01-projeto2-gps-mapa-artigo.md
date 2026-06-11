# Projeto 2 - GPS em Mapa e Artigo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir GPS em mapa dentro do app, habilitar geolocalizacao no Cordova, e criar o artigo cientifico em Markdown.

**Architecture:** Leaflet renderiza o mapa em popup in-app; `cordova-plugin-geolocation` fornece permissao de GPS no dispositivo (fallback no browser). Um artigo Markdown documenta o projeto e evidencia o uso de APIs e recurso nativo.

**Tech Stack:** Framework7, Leaflet, Cordova, Node.js (node:test), Markdown.

---

## File Structure

- **Create:** `tests/ui-map.test.js` (teste de UI para popup do mapa)
- **Modify:** `www/index.html` (assets Leaflet + markup do popup + estilos)
- **Modify:** `www/js/app.js` (renderizacao do mapa e abertura do popup)
- **Modify:** `cordova/package.json` (plugin geolocation)
- **Modify:** `cordova/config.xml` (permissoes de localizacao)
- **Create:** `docs/artigo-projeto-2.md` (artigo cientifico)

---

### Task 1: Popup de Mapa + Leaflet (TDD)

**Files:**
- Create: `tests/ui-map.test.js`
- Modify: `www/index.html`
- Modify: `www/js/app.js`

- [ ] **Step 1: Write the failing test**

Create `tests/ui-map.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('map popup markup and handler exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf-8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  assert.ok(document.querySelector('#map-popup'));
  assert.ok(document.querySelector('#map-container'));
  assert.ok(document.querySelector('#map-fallback'));

  const appJs = fs.readFileSync(path.join(__dirname, '../www/js/app.js'), 'utf-8');
  assert.match(appJs, /function\s+mostrarNoMapa\s*\(/);
  assert.match(appJs, /map-popup/);
  assert.match(appJs, /map-container/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-map.test.js`

Expected: FAIL (missing `#map-popup` / `#map-container`).

- [ ] **Step 3: Add Leaflet assets, popup markup, and styles**

In `www/index.html`, add Leaflet assets in `<head>` after the Material Icons link:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

Add popup markup near other popups (inside `<body>`):

```html
<div class="popup map-popup" id="map-popup">
  <div class="view">
    <div class="page">
      <div class="navbar">
        <div class="navbar-inner">
          <div class="title">Localizacao da avaliacao</div>
          <div class="right"><a href="#" class="link popup-close">Fechar</a></div>
        </div>
      </div>
      <div class="page-content map-popup-content">
        <div class="map-wrapper">
          <div id="map-fallback" class="map-fallback">Carregando mapa...</div>
          <div id="map-container"></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

Add styles inside the existing `<style>` block:

```css
.map-popup-content { padding: 0; }
.map-wrapper { position: relative; width: 100%; height: calc(100vh - 56px); }
#map-container { width: 100%; height: 100%; background: #0b0c10; }
.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c5c6c7;
  background: #0b0c10;
  z-index: 2;
  text-align: center;
  padding: 20px;
}
```

- [ ] **Step 4: Implement map popup logic**

In `www/js/app.js`, add state + map helper near existing popup helpers (after `visualizarFoto`):

```js
let mapaAtual = null;
let mapaMarker = null;

function abrirMapaPopup(lat, lon) {
  const container = document.getElementById('map-container');
  const fallback = document.getElementById('map-fallback');

  if (!container || !fallback) {
    app.dialog.alert('Nao foi possivel carregar o mapa.');
    return;
  }

  app.popup.open('#map-popup');

  const numLat = Number(lat);
  const numLon = Number(lon);
  fallback.textContent = 'Carregando mapa...';
  fallback.style.display = 'flex';
  if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) {
    fallback.textContent = 'Nao foi possivel carregar o mapa.';
    fallback.style.display = 'flex';
    return;
  }

  setTimeout(() => {
    try {
      fallback.style.display = 'none';
      if (!window.L) throw new Error('Leaflet nao carregou');

      if (!mapaAtual) {
        mapaAtual = L.map('map-container');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapaAtual);
        mapaMarker = L.marker([numLat, numLon]).addTo(mapaAtual);
      } else if (mapaMarker) {
        mapaMarker.setLatLng([numLat, numLon]);
      } else {
        mapaMarker = L.marker([numLat, numLon]).addTo(mapaAtual);
      }

      mapaAtual.setView([numLat, numLon], 15);
      mapaAtual.invalidateSize();
    } catch (err) {
      fallback.textContent = 'Nao foi possivel carregar o mapa.';
      fallback.style.display = 'flex';
    }
  }, 300);
}

function mostrarNoMapa(event, lat, lon) {
  event.stopPropagation();
  abrirMapaPopup(lat, lon);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/ui-map.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/ui-map.test.js www/index.html www/js/app.js
git commit -m "feat: add in-app map popup for gps"
```

---

### Task 2: Habilitar Geolocalizacao no Cordova

**Files:**
- Modify: `cordova/package.json`
- Modify: `cordova/config.xml`

- [ ] **Step 1: Add plugin to Cordova package**

In `cordova/package.json`, add `cordova-plugin-geolocation` in `devDependencies` and `cordova.plugins`:

```json
"devDependencies": {
  "cordova-android": "^15.0.0",
  "cordova-browser": "^7.0.0",
  "cordova-ios": "^8.0.1",
  "cordova-plugin-geolocation": "^5.0.0",
  "cordova-plugin-keyboard": "^1.3.0",
  "cordova-plugin-splashscreen": "^6.0.2",
  "cordova-plugin-statusbar": "^4.0.0"
},
"cordova": {
  "plugins": {
    "cordova-plugin-statusbar": {},
    "cordova-plugin-keyboard": {},
    "cordova-plugin-splashscreen": {},
    "cordova-plugin-geolocation": {}
  }
}
```

- [ ] **Step 2: Add permissions to config.xml**

Update the `<widget>` tag to include Android namespace:

```xml
<widget id="io.framework7.myapp" version="1.0.0"
  xmlns="http://www.w3.org/ns/widgets"
  xmlns:cdv="http://cordova.apache.org/ns/1.0"
  xmlns:android="http://schemas.android.com/apk/res/android">
```

Add the plugin entry near the top level:

```xml
<plugin name="cordova-plugin-geolocation" spec="^5.0.0" />
```

Inside `<platform name="android">`, add permissions:

```xml
<config-file parent="/manifest" target="AndroidManifest.xml">
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
</config-file>
```

Inside `<platform name="ios">`, add usage description:

```xml
<config-file target="*-Info.plist" parent="NSLocationWhenInUseUsageDescription">
  <string>Usamos sua localizacao para registrar onde a avaliacao foi feita.</string>
</config-file>
```

- [ ] **Step 3: Commit**

```bash
git add cordova/package.json cordova/config.xml
git commit -m "chore: enable cordova geolocation permissions"
```

---

### Task 3: Artigo Cientifico em Markdown

**Files:**
- Create: `docs/artigo-projeto-2.md`

- [ ] **Step 1: Write the article**

Create `docs/artigo-projeto-2.md`:

```markdown
# Filminho - Projeto 2 (APIs Publicas e Recursos Nativos)

## Resumo
Este artigo apresenta o desenvolvimento do aplicativo Filminho, criado com Apache Cordova e Framework7. O projeto integra APIs publicas para dados reais de filmes e localizacao, adiciona recurso nativo de GPS com visualizacao em mapa, e aplica persistencia local via localStorage. Sao descritas as escolhas tecnicas, resultados obtidos e referencias utilizadas.

## Introducao
Aplicativos moveis modernos dependem de integracao com servicos externos e recursos nativos do dispositivo. O objetivo deste projeto e demonstrar o consumo de APIs publicas e a integracao com GPS em um aplicativo real, com foco em organizacao de codigo, experiencia do usuario e documentacao tecnica.

## Desenvolvimento
O Filminho foi construido com Framework7 para interface e Node.js/Express no backend. As APIs publicas utilizadas foram:

- ViaCEP: consulta de CEP para preencher cidade e UF.
- IBGE (catalogado em dados.gov.br): lista de estados.
- TMDb: dados de filmes, posters e detalhes.

O recurso nativo escolhido foi o GPS. Ao salvar uma avaliacao com foto, o app captura latitude/longitude e exibe a localizacao em um mapa interativo via Leaflet (OpenStreetMap) dentro do aplicativo.

Persistencia local e realizada com localStorage para sessao do usuario e dados basicos de perfil.

## Resultados
O aplicativo permite:
- Cadastro e login com validacao de dados.
- Busca e avaliacao de filmes com notas e fotos.
- Visualizacao de localizacao das avaliacoes em mapa.
- Sistema de amigos com compartilhamento de avaliacoes.

**Screenshots:**
- Tela de login e cadastro: [inserir screenshot]
- Tela de avaliacao com localizacao: [inserir screenshot]
- Mapa da avaliacao: [inserir screenshot]

## Conclusao
O projeto atingiu os requisitos de integracao com APIs publicas e recurso nativo. A combinacao de Cordova, Framework7 e Leaflet permitiu criar um aplicativo funcional e responsivo, com foco em usabilidade e organizacao do codigo.

## Referencias
1. https://viacep.com.br/
2. https://servicodados.ibge.gov.br/api/v1/localidades/estados
3. https://dados.gov.br/
4. https://www.themoviedb.org/
5. https://leafletjs.com/
6. https://cordova.apache.org/
```

- [ ] **Step 2: Commit**

```bash
git add docs/artigo-projeto-2.md
git commit -m "docs: add Projeto 2 scientific article"
```

---

### Task 4: Build APK (Android)

**Files:**
- None (build output only)

- [ ] **Step 1: Run build**

Run: `npm run build-cordova-android`

Expected: build completes with APK output under `cordova/platforms/android/app/build/outputs/apk/`.

---

### Task 5: Full Test Suite

**Files:**
- None (verification)

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass.
