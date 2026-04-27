# Filminho: desenvolvimento de aplicação mobile híbrida com Apache Cordova e Framework7

## 1. Introdução

O desenvolvimento móvel híbrido se consolidou como alternativa viável para equipes acadêmicas e de pequeno porte que precisam entregar aplicações multiplataforma com tempo reduzido de implementação. Nesse contexto, o **Apache Cordova** permite empacotar aplicações web (HTML, CSS e JavaScript) em contêineres nativos, viabilizando acesso a recursos do dispositivo por plugins [1]. Em paralelo, o **Framework7** fornece componentes de interface focados em experiência mobile, com navegação, popups e elementos visuais otimizados para Android e iOS [2].

O projeto **Filminho** aplica essa combinação tecnológica para criar um aplicativo de descoberta e avaliação de filmes, integrando frontend híbrido e backend em Node.js/Express. O objetivo deste artigo é apresentar a implementação, destacando a estratégia de CRUD, persistência local e organização lógica do código.

## 2. Metodologia

### 2.1 Implementação do CRUD

O CRUD principal do domínio de avaliações foi implementado por endpoints REST no backend (`backend/server.js`) e consumido no frontend (`www/js/app.js`):

- **Create**: `POST /api/avaliar` registra nova avaliação de filme.
- **Read**: `GET /api/perfil/:id_usuario` recupera perfil e lista de avaliações.
- **Update**: `PUT /api/perfil/:id_usuario` atualiza nome do usuário.
- **Delete**: `DELETE /api/avaliar/:id_avaliacao` remove avaliação existente.

Essa abordagem separa responsabilidades de interface e persistência, permitindo evolução incremental da aplicação.

### 2.2 Uso do `localStorage`

O `localStorage` é utilizado para manter localmente o nome do usuário (`nome_usuario_filminho`), reduzindo necessidade de nova entrada de dados a cada sessão. No arquivo `www/js/app.js`, o valor é inicializado, lido para renderização do perfil e atualizado durante a edição de nome. Esse mecanismo segue o padrão de armazenamento chave-valor do Web Storage [3], com baixa complexidade e alta disponibilidade no navegador.

### 2.3 Organização em classes (`model.js` e `manager.js`)

Para documentação arquitetural, a lógica do projeto pode ser representada em duas camadas de classes:

- **`model.js`**: concentraria estruturas de dados e regras de domínio (ex.: `Avaliacao`, `Usuario`, serialização e validação de campos essenciais).
- **`manager.js`**: coordenaria operações de aplicação (consumo de API, orquestração de CRUD, atualização de interface e sincronização com `localStorage`).

No estado atual do repositório, essa separação aparece de forma funcional entre backend (`server.js`) e frontend (`app.js`), mas a modelagem em classes explicita melhor manutenção, testes e extensibilidade.

## 3. Resultados

As funcionalidades observadas no Filminho demonstram o atendimento dos objetivos propostos:

1. listagem de filmes populares e por categoria;
2. busca textual por títulos e sorteio de recomendação;
3. visualização de detalhes (sinopse, elenco e provedores de streaming);
4. registro de avaliações com nota, marcação de reassistido, foto opcional e geolocalização;
5. exibição de diário pessoal com remoção de avaliações;
6. edição de perfil com persistência local e atualização no backend.

Os resultados indicam que a arquitetura híbrida adotada foi suficiente para sustentar fluxo completo de uso, do consumo de dados externos à personalização de conteúdo pelo usuário.

## 4. Conclusão

O desenvolvimento do Filminho reforçou o aprendizado sobre integração entre frontend híbrido, backend REST e persistência local. O uso conjunto de Cordova e Framework7 simplificou a construção de interface mobile, enquanto Node.js/Express permitiu estruturar serviços de forma objetiva.

Entre os principais desafios, destacam-se: organização de estado de interface, consistência dos dados de avaliações e tratamento de permissões para recursos do dispositivo (câmera e localização). Como continuidade, recomenda-se consolidar formalmente a separação em classes (`model.js` e `manager.js`) e ampliar cobertura de testes para aumentar robustez e manutenção em longo prazo.

## Referências

[1] APACHE CORDOVA. *Apache Cordova Documentation*. Disponível em: <https://cordova.apache.org/docs/en/latest/>. Acesso em: 27 abr. 2026.  
[2] FRAMEWORK7. *Framework7 Documentation*. Disponível em: <https://framework7.io/docs/>. Acesso em: 27 abr. 2026.  
[3] MDN WEB DOCS. *Window: localStorage property*. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>. Acesso em: 27 abr. 2026.
