# Filminho

Aplicativo mobile/web para descoberta e avaliação de filmes, desenvolvido com Apache Cordova e Framework7 como projeto integrador da disciplina de Desenvolvimento Mobile.

## Integrantes

- Marcos de Oliveira - RA 082028
- Oliver Henrique - RA 083885

## Descrição do app

O Filminho permite explorar filmes populares, pesquisar títulos, visualizar detalhes completos e registrar avaliações pessoais. A aplicação combina:

- Frontend em Framework7 (interface responsiva com foco em mobile)
- Backend Node.js + Express (API própria e integração com TMDb)
- Persistência local de dados de perfil e avaliações

## Artigo científico

- Consulte o arquivo [`ARTIGO_CIENTIFICO.md`](./ARTIGO_CIENTIFICO.md), contendo introdução, metodologia, resultados, conclusão e citações.

## Tecnologias utilizadas

- Apache Cordova
- Framework7
- HTML5
- CSS3
- JavaScript ES6+
- Node.js
- Express.js
- Axios
- TMDb API
- localStorage (nome de usuário)
- JSON local em `backend/banco_filminho.json` (perfil e avaliações)

## Funcionalidades implementadas

### Catálogo e descoberta

- Listagem de filmes em tendência
- Navegação por categorias (Ação, Comédia, Terror, Ficção)
- Busca por título com atualização dinâmica
- Sorteio de filme aleatório para recomendação rápida

### Detalhes do filme

- Página de detalhes com:
  - título, ano e duração
  - sinopse
  - elenco principal
  - provedores de streaming (quando disponíveis para BR)

### Diário e avaliações

- Criação de avaliação com nota de 0.5 a 5.0
- Marcação de filme como reassistido
- Inclusão opcional de foto via câmera
- Captura opcional de localização ao salvar avaliação com foto
- Listagem de avaliações no perfil
- Remoção de avaliação do diário

### Perfil

- Exibição de avatar dinâmico e nome do usuário
- Edição do nome do perfil
- Carrossel de filmes recentes avaliados

## Estrutura do projeto

```text
projetofilminho/
|- backend/
|  |- banco_filminho.json
|  \- server.js
|- build/
|  \- build.mjs
|- cordova/
|  |- config.xml
|  \- package.json
|- www/
|  |- index.html
|  |- css/
|  |- js/
|  \- pages/
|- package.json
\- README.md
```

## Pré-requisitos

- Node.js 18+ e npm
- Cordova CLI (global ou via `npx`)

## Como executar

### 1) Execução recomendada (frontend + API no mesmo host)

Na raiz do projeto:

```bash
npm install
node backend/server.js
```

Abra no navegador:

- http://localhost:3000

### 2) Execução com Cordova no navegador (fluxo acadêmico)

Na raiz do projeto:

```bash
npm install
node build/build.mjs
```

Depois, dentro da pasta `cordova`:

```bash
cd cordova
npm install
cordova platform add browser
cordova run browser
```

Se o comando `cordova` não estiver disponível globalmente, use:

```bash
npx cordova platform add browser
npx cordova run browser
```

## Scripts úteis (raiz)

| Script | Comando | Descrição |
| --- | --- | --- |
| Desenvolvimento web | `npm run start` | Sobe backend e servidor estático em paralelo |
| Backend | `npm run serve-backend` | Inicia API Express em `http://localhost:3000` |
| Frontend estático | `npm run serve-frontend` | Serve `www/` em `http://localhost:8080` |
| Build Cordova | `npm run build-cordova` | Copia assets e executa build Cordova |
| Rodar Android | `npm run cordova-android` | Copia assets e executa app no Android |
| Rodar iOS | `npm run cordova-ios` | Copia assets e executa app no iOS |

## Endpoints da API

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/filmes/tendencias` | Lista filmes populares |
| GET | `/api/filmes/categoria/:id` | Lista filmes por gênero |
| GET | `/api/filmes/sortear` | Retorna um filme aleatório |
| GET | `/api/filme/:id` | Retorna detalhes completos do filme |
| GET | `/api/filmes/buscar?q=...` | Busca filmes por termo |
| POST | `/api/avaliar` | Salva nova avaliação |
| DELETE | `/api/avaliar/:id_avaliacao` | Remove avaliação |
| GET | `/api/perfil/:id_usuario` | Retorna perfil + avaliações |
| PUT | `/api/perfil/:id_usuario` | Atualiza nome do usuário |

## Observações técnicas

- A chave da TMDb está atualmente definida em `backend/server.js`.
- Para ambiente de produção, recomenda-se mover a chave para variável de ambiente.
- O arquivo `backend/banco_filminho.json` funciona como base local para usuários e avaliações.
