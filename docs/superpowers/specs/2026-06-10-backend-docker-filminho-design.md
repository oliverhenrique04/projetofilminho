# Deploy do Backend em /filminho

## Objetivo

Publicar o backend do Filminho em `https://nuted-ia.dev/filminho` usando Docker e proxy reverso, e configurar o app para consumir `https://nuted-ia.dev/filminho/api` como URL padrão fixa.

## Escopo

- Dockerizar o backend Node/Express.
- Servir a aplicação Express com prefixo de base `/filminho`.
- Expor o backend por proxy reverso no host `nuted-ia.dev`.
- Ajustar o frontend/app para usar `https://nuted-ia.dev/filminho/api` como base padrão.
- Atualizar documentação de execução e deploy.
- Adicionar testes para garantir que o prefixo `/filminho` e a URL remota padrão continuem corretos.

## Fora de Escopo

- Pipeline CI/CD.
- TLS/certificados automatizados.
- Ambientes múltiplos com seleção dinâmica.
- Fallback local automático no app.

## Arquitetura

### Backend

O servidor Express deixará de assumir que está na raiz `/`. Ele passará a operar com um `base path` configurável, com padrão `/filminho`. As rotas da API serão montadas sob `/filminho/api`, e os assets web servidos pelo Express ficarão disponíveis sob `/filminho/`.

### Docker

Será criado um `Dockerfile` para o backend com Node em modo produção, carregando `.env` e iniciando `backend/server.js`. Também será criado um `docker-compose.yml` para facilitar a execução local/servidor com volume persistente para o banco JSON e injeção de variáveis de ambiente.

### Proxy reverso

Será adicionada uma configuração de proxy para o host `https://nuted-ia.dev` encaminhar `/filminho` ao container do backend. O proxy deve preservar o prefixo para evitar reescritas frágeis no app.

### App

O frontend deixará de inferir o host padrão local e passará a usar `https://nuted-ia.dev/filminho/api` como base fixa padrão. O comportamento deve continuar compatível com Cordova e navegador, desde que o backend remoto esteja disponível.

## Dados e Configuração

- `APP_BASE_PATH=/filminho`
- `APP_PUBLIC_API_URL=https://nuted-ia.dev/filminho/api`
- `PORT` para o processo Node interno do container
- `GOOGLE_APPLICATION_CREDENTIALS` mantido para Firebase Admin
- `FILMINHO_DB` mantido para persistência JSON

## Testes

- Teste de configuração do frontend para confirmar URL remota padrão.
- Teste do backend para confirmar que endpoints respondem sob `/filminho/api`.
- Teste de build/execução Docker básica, se viável neste ambiente.
- Regressão completa com `npm test`.

## Riscos

- Quebra de caminhos estáticos se o prefixo `/filminho` não for aplicado de forma consistente.
- Conflitos entre proxy e rotas absolutas do frontend.
- Persistência do banco JSON em container sem volume configurado.

## Estratégia Recomendada

Implementar o `base path` no Express, usar URL remota fixa no app, e publicar por proxy reverso preservando `/filminho`. Essa abordagem reduz ambiguidade operacional e deixa produção e app alinhados com a URL final pública.
