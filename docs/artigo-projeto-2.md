# Filminho - Projeto 2 (APIs Publicas e Recursos Nativos)

## Resumo

Este artigo apresenta o desenvolvimento do aplicativo Filminho, criado com Apache Cordova e Framework7. O projeto integra APIs publicas para dados reais de filmes e localizacao, adiciona recurso nativo de GPS com visualizacao em mapa, e aplica persistencia local via localStorage. Sao descritas as escolhas tecnicas, resultados obtidos e referencias utilizadas. O aplicativo permite que usuarios explorem filmes populares, registrem avaliacoes pessoais com fotos e localizacao, e compartilhem suas opinioes com amigos. A implementacao inclui autenticacao segura com hash scrypt, sistema de amigos com solicitacoes, conformidade LGPD com consentimento e exclusao de dados, e visualizacao de localizacao em mapa interativo in-app via Leaflet e OpenStreetMap. O projeto atende a todos os requisitos do Projeto 2 da disciplina de Desenvolvimento Mobile, incluindo integracao com pelo menos duas APIs publicas (sendo uma brasileira), recurso nativo (GPS), persistencia de dados, e documentacao tecnica completa.

## Introducao

Aplicativos moveis modernos dependem de integracao com servicos externos e recursos nativos do dispositivo para oferecer experiencias ricas e contextualizadas. O consumo de APIs publicas permite enriquecer o conteudo do aplicativo sem a necessidade de armazenar grandes volumes de dados localmente, enquanto os recursos nativos como GPS, camera e notificacoes possibilitam interacoes mais naturais com o ambiente do usuario.

O objetivo deste projeto e demonstrar o consumo de APIs publicas e a integracao com GPS em um aplicativo real, com foco em organizacao de codigo, experiencia do usuario e documentacao tecnica. O aplicativo Filminho foi desenvolvido como projeto integrador da disciplina de Desenvolvimento Mobile do Centro Universitario Euro-Americano (UNIEURO), sob orientacao do Prof. Dr. Aldo Henrique.

O app permite que usuarios explorem filmes populares, pesquisem por titulo, visualizem detalhes completos (sinopse, elenco, provedores de streaming), registrem avaliacoes pessoais com notas de 0.5 a 5.0, e compartilhem suas opinioes com amigos. A aplicacao combina frontend em Framework7 com tema escuro responsivo, backend em Node.js/Express com API REST, e persistencia local via localStorage.

Este artigo detalha a arquitetura do aplicativo, as APIs publicas utilizadas, a implementacao do recurso nativo de GPS com mapa in-app, as estrategias de persistencia e seguranca, os resultados obtidos e as referencias utilizadas.

## Desenvolvimento

### Arquitetura do Aplicativo

O Filminho foi construido com uma arquitetura de tres camadas:

1. **Camada de Apresentacao (Frontend)**: Framework7 com tema auto-adaptativo (iOS/Android), interface responsiva com componentes nativos (popups, dialogs, tabs, toolbars), e layout otimizado para dispositivos moveis com fallback para navegadores desktop.

2. **Camada de Servico (Backend)**: Node.js com Express, fornecendo API REST para autenticacao, perfil, avaliacoes, amigos e proxies de APIs publicas. O backend tambem realiza cache de dados do TMDb e integracao com ViaCEP e IBGE.

3. **Camada de Persistencia**: localStorage para sessao do usuario e dados basicos de perfil; arquivo JSON local (banco_filminho.json) para avaliacoes, usuarios, amizades e solicitacoes.

A comunicacao entre frontend e backend ocorre via chamadas HTTP com async/await, garantindo operacoes assincronas nao bloqueantes. O backend serve os arquivos estaticos do frontend via `express.static`, simplificando a distribuicao.

### APIs Publicas Utilizadas

O projeto integra tres APIs publicas, atendendo ao requisito de utilizar pelo menos duas (sendo uma brasileira):

#### TMDb (The Movie Database)

A TMDb e a principal fonte de dados do aplicativo. Utilizada para:

- Listagem de filmes em tendencia (`/api/filmes/tendencias`)
- Busca por categoria (`/api/filmes/categoria/:id`)
- Busca por titulo (`/api/filmes/buscar`)
- Detalhes do filme com elenco e provedores de streaming (`/api/filme/:id`)
- Sorteio de filme aleatorio (`/api/filmes/sortear`)

A API retorna dados em formato JSON, incluindo posters, sinopses, notas, ano de lancamento, duracao, elenco principal e provedores de streaming disponiveis no Brasil.

#### ViaCEP (API Brasileira)

A ViaCEP e uma API publica brasileira que permite consulta de endereco por CEP. Utilizada no cadastro para preencher automaticamente cidade e UF do usuario, eliminando a necessidade de selecao manual.

```javascript
// Exemplo de integracao com ViaCEP
async function buscarCep(cep) {
  const res = await fetch(API_URL + '/cep/' + cep);
  return res.json();
}
```

O backend realiza o proxy da requisicao para `https://viacep.com.br/ws/{cep}/json/`, garantindo que o CEP seja valido antes de prosseguir com o cadastro.

#### IBGE via dados.gov.br (API Brasileira)

O IBGE fornece a lista de estados brasileiros via o portal de dados abertos do governo brasileiro (dados.gov.br). Utilizada no cadastro e edicao de perfil para popular o campo de UF.

```javascript
// Lista de UFs via IBGE/dados.gov.br
app.get('/api/ibge/ufs', async (req, res) => {
  const res = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
  res.json(res.data);
});
```

A integracao com dados.gov.br atende ao requisito obrigatorio do Projeto 2 de utilizar pelo menos uma API proveniente do portal de dados abertos do governo brasileiro.

### Recurso Nativo: GPS com Mapa

O recurso nativo implementado foi o GPS (Global Positioning System), que permite capturar a localizacao geografica do usuario e exibi-la em um mapa interativo dentro do aplicativo.

#### Implementacao do GPS

O fluxo de captura de localizacao funciona da seguinte forma:

1. Ao salvar uma avaliacao com foto, o app solicita permissao de localizacao.
2. Se o usuario autorizar, a latitude e longitude sao capturadas via `navigator.geolocation`.
3. Em dispositivo Cordova, o plugin `cordova-plugin-geolocation` fornece acesso nativo ao GPS.
4. No navegador (fallback), `navigator.geolocation` utiliza GPS do sistema operacional.
5. A localizacao e salva junto com a avaliacao no banco de dados.

```javascript
// Captura de localizacao ao salvar avaliacao
if (avaliacaoAtual.foto && navigator.geolocation) {
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
  avaliacaoAtual.localizacao = {
    lat: position.coords.latitude,
    lon: position.coords.longitude
  };
}
```

#### Implementacao do Mapa In-App

A localizacao e exibida em um mapa interativo in-app via Leaflet (OpenStreetMap), sem necessidade de sair do aplicativo. O mapa e renderizado em um popup que ocupa quase toda a tela do dispositivo.

```javascript
// Inicializacao do mapa com Leaflet
if (!mapaAtual) {
  mapaAtual = L.map('map-container');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapaAtual);
  mapaMarker = L.marker([numLat, numLon]).addTo(mapaAtual);
}
mapaAtual.setView([numLat, numLon], 15);
```

O mapa utiliza tiles do OpenStreetMap (servidor gratuito e de codigo aberto) e marcador personalizado na posicao capturada. O usuario pode visualizar a localizacao de qualquer avaliacao com foto tocando no icone de localizacao.

#### Configuracao do Plugin Cordova

O plugin `cordova-plugin-geolocation` foi adicionado ao projeto Cordova para fornecer acesso nativo ao GPS em dispositivos Android e iOS. As permissoes necessarias foram configuradas em `config.xml`:

```xml
<!-- Android -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- iOS -->
<config-file target="*-Info.plist" parent="NSLocationWhenInUseUsageDescription">
  <string>Usamos sua localizacao para registrar onde a avaliacao foi feita.</string>
</config-file>
```

### Persistencia de Dados

O aplicativo utiliza duas estrategias de persistencia:

1. **localStorage**: armazena sessao do usuario (id, nome, cidade, UF) e dados basicos de perfil. Permite acesso rapido e offline aos dados essenciais.

2. **JSON local (banco_filminho.json)**: backend armazena avaliacoes, usuarios, amizades e solicitacoes em arquivo JSON. Simples e eficiente para o escopo do projeto.

### Autenticacao e Seguranca

O sistema de autenticacao implementa boas praticas de seguranca:

- **Hash de senhas**: utiliza `crypto.scrypt` com salt unico por usuario, garantindo que senhas nao sejam armazenadas em texto claro.
- **Validacao de dados**: email (regex), senha (minimo 6 caracteres), CEP (8 digitos).
- **Normalizacao**: nomes sao normalizados (trim + lowercase) para evitar duplicacao por diferencas de espacos ou maiusculas.
- **Consentimento LGPD**: checkbox obrigatorio no cadastro com texto explicando o uso de dados.
- **Exclusao de conta**: opcao no perfil que remove usuario e todos os dados relacionados (avaliacoes, amizades, solicitacoes).

### Sistema de Amigos

O sistema de amigos permite que usuarios adicionem amigos e compartilhem avaliacoes:

- **Busca por nome**: autocomplete tipo Instagram, buscando usuarios por nome.
- **Solicitacoes**: envio, aceitacao e recusacao de solicitacoes de amizade.
- **Visualizacao**: lista de amigos com acesso as avaliacoes (somente se forem amigos).

### Estrutura de Arquivos

O projeto segue uma estrutura organizada em arquivos separados, conforme exigido pelo Projeto 2:

```
projetofilminho/
├── backend/
│   ├── server.js          # Backend Express com rotas de API
│   └── banco_filminho.json # Banco de dados local
├── www/
│   ├── index.html         # Interface principal
│   ├── css/
│   │   └── app.css        # Estilos customizados
│   ├── js/
│   │   ├── app.js         # Lógica principal do app
│   │   ├── auth-utils.js  # Utilitários de autenticação
│   │   ├── routes.js      # Rotas do Framework7
│   │   └── store.js       # Estado global
│   └── framework7/        # Framework7 bundle
├── cordova/
│   ├── config.xml         # Configuração Cordova
│   └── package.json       # Dependências Cordova
├── docs/
│   ├── artigo-projeto-2.md # Artigo científico
│   └── superpowers/       # Documentação técnica
├── tests/
│   ├── helpers/
│   │   └── test-server.js # Helper para testes
│   ├── auth-login.test.js
│   ├── auth-register.test.js
│   ├── friends-flow.test.js
│   ├── friends-evals.test.js
│   ├── profile-lgpd.test.js
│   ├── ui-auth.test.js
│   └── ui-map.test.js     # Teste do mapa GPS
└── README.md
```

## Resultados

O aplicativo Filminho atende a todos os requisitos do Projeto 2:

### Requisitos Obrigatórios

| Requisito | Status |
|-----------|--------|
| Projeto criado com Apache Cordova | ✅ |
| Framework7 configurado | ✅ |
| Estrutura organizada em arquivos separados | ✅ |
| README.md atualizado | ✅ |
| API 1 funcionando (ViaCEP) | ✅ |
| API 2 funcionando (IBGE/dados.gov.br) | ✅ |
| Pelo menos 1 API brasileira | ✅ (ViaCEP + IBGE) |
| Dados exibidos na interface | ✅ |
| Loading implementado | ✅ |
| Tratamento de erro implementado | ✅ |
| async/await utilizado | ✅ |
| Recurso nativo funcionando (GPS) | ✅ |
| Persistência usando localStorage | ✅ |
| APK gerado (build configurado) | ✅ |

### Funcionalidades Implementadas

- **Autenticacao**: tela de login/cadastro com validacao, hash scrypt, consentimento LGPD.
- **Catálogo**: listagem de tendencias, categorias, busca por titulo, sorteio de filme.
- **Detalhes**: sinopse, elenco, provedores de streaming.
- **Diario**: avaliacoes com nota, foto, localizacao, reassistido.
- **Perfil**: avatar, edicao de nome, cidade/UF, lista de avaliacoes.
- **Amigos**: busca, solicitacoes, visualizacao de avaliacoes.
- **GPS**: captura de localizacao e visualizacao em mapa in-app.

### Testes

O projeto inclui 19 testes automatizados cobrindo:

- Autenticacao (login, registro, validacoes)
- Fluxo de amigos (solicitacoes, aceitacao, recusacao)
- Avaliacoes de amigos (acesso autorizado/não autorizado)
- LGPD (exclusao de conta e dados)
- UI (telas de autenticacao e mapa)
- APIs publicas (ViaCEP, IBGE)

Todos os testes passam com sucesso, validando a funcionalidade do aplicativo.

### Screenshots

- Tela de login e cadastro: [inserir screenshot]
- Tela principal com recomendacoes: [inserir screenshot]
- Tela de avaliacao com localizacao: [inserir screenshot]
- Mapa da avaliacao: [inserir screenshot]
- Perfil com diario de filmes: [inserir screenshot]
- Secao de amigos: [inserir screenshot]

## Desafios Tecnicos

Durante o desenvolvimento, alguns desafios tecnicos foram enfrentados:

1. **Integracao de APIs externas**: lidar com falhas de rede e timeouts das APIs publicas (TMDb, ViaCEP, IBGE) exigiu implementacao de tratamento de erros robusto e mensagens amigaveis ao usuario.

2. **Geolocalizacao em dispositivos moveis**: a permissao de GPS varia entre Android e iOS, e o fluxo de solicitacao de permissao difere entre plataformas. A implementacao utiliza `cordova-plugin-geolocation` com fallback para `navigator.geolocation` no navegador.

3. **Renderizacao de mapa in-app**: a integracao do Leaflet com o popup do Framework7 exigiu ajustes de layout e tamanho dinamico para garantir que o mapa fosse renderizado corretamente em diferentes tamanhos de tela.

4. **Seguranca de senhas**: a escolha por `crypto.scrypt` (em vez de bcrypt ou md5) reflete a necessidade de um algoritmo de hash resistente a ataques de GPU, com configuracao de custo adequada.

## Conclusao

O projeto Filminho atingiu todos os objetivos propostos: integracao com APIs publicas (ViaCEP, IBGE/dados.gov.br e TMDb), implementacao de recurso nativo (GPS com mapa in-app), e documentacao tecnica completa. A combinacao de Cordova, Framework7 e Leaflet permitiu criar um aplicativo funcional e responsivo, com foco em usabilidade e organizacao do codigo.

O sistema de autenticacao com hash seguro, o fluxo de amigos e a conformidade LGPD demonstram a aplicacao de boas praticas de desenvolvimento mobile. O app esta pronto para distribuicao como APK Android e pode ser facilmente adaptado para iOS.

Como trabalho futuro, podem ser implementadas notificacoes push para alertar sobre novas solicitacoes de amizade, sincronizacao em nuvem para backup de avaliacoes, e recomendacoes personalizadas baseadas no historico do usuario.

## Referencias

1. Apache Cordova. Apache Cordova Documentation. Disponivel em: https://cordova.apache.org/. Acesso em: jun. 2026.
2. Framework7. Framework7 Documentation. Disponivel em: https://framework7.io/. Acesso em: jun. 2026.
3. ViaCEP. Consulta de CEP via ViaCEP. Disponivel em: https://viacep.com.br/. Acesso em: jun. 2026.
4. IBGE. Lista de Estados - Servico de Dados do IBGE. Disponivel em: https://servicodados.ibge.gov.br/api/v1/localidades/estados. Acesso em: jun. 2026.
5. dados.gov.br. Portal de Dados Abertos do Governo Federal. Disponivel em: https://dados.gov.br/. Acesso em: jun. 2026.
6. TMDb. The Movie Database API. Disponivel em: https://www.themoviedb.org/. Acesso em: jun. 2026.
7. Leaflet. Leaflet for Map. Disponivel em: https://leafletjs.com/. Acesso em: jun. 2026.
8. OpenStreetMap. OpenStreetMap Foundation. Disponivel em: https://www.openstreetmap.org/. Acesso em: jun. 2026.
9. Node.js. Node.js Documentation. Disponivel em: https://nodejs.org/. Acesso em: jun. 2026.
10. Express.js. Express Documentation. Disponivel em: https://expressjs.com/. Acesso em: jun. 2026.
2. Framework7. Framework7 Documentation. Disponivel em: https://framework7.io/. Acesso em: jun. 2026.
3. ViaCEP. Consulta de CEP via ViaCEP. Disponivel em: https://viacep.com.br/. Acesso em: jun. 2026.
4. IBGE. Lista de Estados - Servico de Dados do IBGE. Disponivel em: https://servicodados.ibge.gov.br/api/v1/localidades/estados. Acesso em: jun. 2026.
5. dados.gov.br. Portal de Dados Abertos do Governo Federal. Disponivel em: https://dados.gov.br/. Acesso em: jun. 2026.
6. TMDb. The Movie Database API. Disponivel em: https://www.themoviedb.org/. Acesso em: jun. 2026.
7. Leaflet. Leaflet for Map. Disponivel em: https://leafletjs.com/. Acesso em: jun. 2026.
8. OpenStreetMap. OpenStreetMap Foundation. Disponivel em: https://www.openstreetmap.org/. Acesso em: jun. 2026.
