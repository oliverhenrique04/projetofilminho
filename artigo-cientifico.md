# Filminho: Desenvolvimento de um Aplicativo Móvel Híbrido com Apache Cordova e Framework7 para Gerenciamento de Avaliações Cinematográficas

**Autor:** Oliver Henrique

**Curso:** Desenvolvimento de Sistemas Móveis

**Data:** Abril de 2026

---

## Resumo

Este artigo descreve o processo de desenvolvimento do aplicativo móvel híbrido *Filminho*, uma plataforma pessoal de registro e acompanhamento de avaliações cinematográficas. O projeto foi construído com as tecnologias Apache Cordova e Framework7, utilizando JavaScript puro, HTML5 e CSS3. O trabalho abrange o planejamento da arquitetura, a implementação de um servidor backend em Node.js com Express, a integração com a API pública do The Movie Database (TMDB) e a organização do código em camadas por meio das classes `model.js` e `manager.js`. São discutidos os desafios encontrados, as soluções adotadas e as lições aprendidas durante o desenvolvimento.

**Palavras-chave:** Apache Cordova; Framework7; Aplicativo Híbrido; JavaScript; CRUD; localStorage; TMDB.

---

## 1. Introdução

O crescimento exponencial do mercado de aplicativos móveis nas últimas décadas transformou a forma como as pessoas consomem entretenimento. Segundo dados da Statista (2024), o número de downloads de aplicativos móveis ultrapassou 250 bilhões por ano globalmente, evidenciando a relevância do desenvolvimento mobile. Nesse contexto, ferramentas que permitem a criação de aplicativos multiplataforma a partir de tecnologias web consolidadas — como HTML, CSS e JavaScript — tornaram-se altamente atrativas tanto para desenvolvedores iniciantes quanto para equipes profissionais.

O **Apache Cordova** é um framework open-source mantido pela Apache Software Foundation que possibilita o empacotamento de aplicações web como aplicativos nativos para Android, iOS e outras plataformas. Sua principal vantagem é permitir o acesso a APIs nativas do dispositivo (câmera, geolocalização, armazenamento) por meio de plugins JavaScript, eliminando a necessidade de escrever código nativo (APACHE CORDOVA, 2024). O Cordova funciona como uma "casca" nativa que carrega uma WebView, dentro da qual a aplicação web é executada normalmente.

O **Framework7** é uma biblioteca de interface de usuário open-source projetada especificamente para a criação de aplicativos móveis e web com aparência nativa para iOS e Android. Oferece um conjunto completo de componentes de UI (NavBar, Toolbar, Popup, Dialog, Swiper, entre outros), sistema de rotas e utilitários de JavaScript, sem depender de nenhum framework de front-end externo (FRAMEWORK7, 2024). Sua utilização em conjunto com o Apache Cordova é amplamente recomendada pela comunidade, resultando em aplicativos responsivos e com excelente experiência do usuário.

O presente trabalho descreve o desenvolvimento do *Filminho*, um aplicativo móvel híbrido para registro pessoal de filmes assistidos, com funcionalidades de avaliação por notas de 0,5 a 5,0 estrelas, adição de fotos, geolocalização, e integração em tempo real com a API do TMDB para busca e exibição de informações cinematográficas.

---

## 2. Metodologia

### 2.1 Arquitetura do Sistema

O sistema *Filminho* adota uma arquitetura em dois níveis: um **frontend** empacotado pelo Apache Cordova e um **backend** em Node.js com Express, que atua como intermediador entre o aplicativo e a API externa do TMDB.

```
┌─────────────────────────────┐
│         Frontend            │
│   (Cordova + Framework7)    │
│   www/index.html            │
│   www/js/app.js             │
│   www/js/model.js           │
│   www/js/manager.js         │
└────────────┬────────────────┘
             │ HTTP / REST
┌────────────▼────────────────┐
│         Backend             │
│   Node.js + Express         │
│   backend/server.js         │
│   backend/banco_filminho.json│
└────────────┬────────────────┘
             │ HTTPS
┌────────────▼────────────────┐
│    API Externa (TMDB)       │
│    api.themoviedb.org       │
└─────────────────────────────┘
```

Essa separação respeita o princípio da separação de responsabilidades (*Separation of Concerns*), facilitando a manutenção e a eventual substituição de componentes.

### 2.2 Organização do Código em Classes

Para garantir código legível, reutilizável e testável, a camada de dados e de regras de negócio foi estruturada em dois módulos JavaScript:

#### 2.2.1 `model.js` — Classes de Domínio

O arquivo `model.js` define as entidades centrais da aplicação por meio de classes JavaScript (ES6+):

**Classe `Filme`:** Representa um filme obtido da API TMDB. Armazena atributos como `id`, `titulo`, `poster_path`, `backdrop_path`, `sinopse`, `data_lancamento`, `duracao` e `generos`. Expõe *getters* calculados para `ano` (extrai o ano de `data_lancamento`) e `urlPoster`/`urlBackdrop` (monta as URLs completas das imagens).

**Classe `Avaliacao`:** Representa uma avaliação registrada pelo usuário. Contém os campos `id_avaliacao`, `id_usuario`, `id_filme`, `titulo_filme`, `nota` (0,5 a 5,0), `poster_path`, `reassistido` (booleano), `foto` (base64 ou nulo), `localizacao` (objeto `{lat, lon}` ou nulo) e `data` (ISO 8601). O *getter* `notaFormatada` retorna a nota com uma casa decimal.

A adoção de classes para modelar o domínio favorece a orientação a objetos e facilita a validação e a expansão futura das entidades.

#### 2.2.2 `manager.js` — Camada de Persistência com `localStorage`

O arquivo `manager.js` implementa a classe `FilminhoManager`, responsável por todas as operações de **CRUD** (*Create, Read, Update, Delete*) sobre as avaliações do usuário, utilizando o `localStorage` do navegador como mecanismo de persistência local.

O `localStorage` é uma API da Web que permite armazenar pares chave-valor de forma persistente no dispositivo do usuário, sem expiração de sessão (MDN WEB DOCS, 2024). Seu uso dispensa a necessidade de conexão com o servidor para operações básicas de leitura e escrita, tornando a aplicação mais resiliente a falhas de rede.

Os métodos principais de `FilminhoManager` são:

| Método | Descrição |
|---|---|
| `listarAvaliacoes()` | Retorna todas as avaliações como instâncias de `Avaliacao` |
| `buscarAvaliacaoPorId(id)` | Localiza uma avaliação específica pelo seu ID |
| `adicionarAvaliacao(dados)` | Persiste uma nova avaliação com ID gerado via `Date.now()` |
| `atualizarAvaliacao(id, novos_dados)` | Atualiza campos de uma avaliação existente |
| `removerAvaliacao(id)` | Remove uma avaliação pelo ID |
| `limparAvaliacoes()` | Remove todas as avaliações armazenadas |
| `carregarPerfil()` | Carrega o perfil do usuário (nome) |
| `salvarPerfil(perfil)` | Persiste o perfil do usuário |
| `atualizarNome(nome)` | Atalho para atualizar apenas o nome |

O padrão de serialização adotado é JSON, utilizando `JSON.stringify` para escrita e `JSON.parse` para leitura, com tratamento de exceções para garantir robustez mesmo diante de dados corrompidos.

### 2.3 Integração com a API TMDB

A **The Movie Database (TMDB)** disponibiliza uma API RESTful gratuita com dados de mais de 800 mil filmes, incluindo títulos, sinopses, pôsteres, datas de lançamento, elenco, gêneros e provedores de streaming (TMDB, 2024). O backend do *Filminho* consome endpoints como:

- `GET /movie/popular` — filmes populares (tendências)
- `GET /discover/movie?with_genres={id}` — filmes por gênero
- `GET /search/movie?query={termo}` — busca por título
- `GET /movie/{id}?append_to_response=credits,watch/providers` — detalhes completos

O uso de um backend intermediário (proxy) para consumir a API TMDB protege a chave de autenticação, evitando sua exposição no código-fonte do cliente.

### 2.4 Funcionalidades Implementadas

O aplicativo foi desenvolvido com as seguintes funcionalidades:

1. **Navegação por abas:** aba *Início* e aba *Perfil*, gerenciadas pelo sistema de abas do Framework7.
2. **Busca de filmes:** campo de busca com pesquisa reativa (evento `oninput`) que consulta a API TMDB a cada digitação.
3. **Categorias:** filtros por gênero (Ação, Comédia, Terror, Ficção Científica).
4. **Sorteio de filme:** seleção aleatória de um título para sugestão ao usuário.
5. **Detalhes do filme:** exibição de pôster, sinopse, elenco, provedores de streaming e botão de avaliação.
6. **Avaliação com estrelas:** sistema de meia-estrela (0,5 pontos por clique na metade esquerda da estrela).
7. **Foto associada:** captura de foto via câmera do dispositivo usando a API `getUserMedia`, armazenada em base64.
8. **Geolocalização:** registro das coordenadas GPS no momento da avaliação, com link para Google Maps.
9. **Diário pessoal:** listagem das avaliações com opção de exclusão.
10. **Edição de perfil:** alteração do nome de exibição.

### 2.5 Ferramentas e Tecnologias Utilizadas

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Apache Cordova | 12.x | Empacotamento para mobile |
| Framework7 | 9.0.3 | Interface de usuário |
| Node.js | 18+ | Runtime do backend |
| Express | 4.x | Servidor HTTP |
| Axios | 1.x | Requisições HTTP no backend |
| TMDB API | v3 | Dados cinematográficos |
| localStorage | — | Persistência local |
| MediaDevices API | — | Acesso à câmera |
| Geolocation API | — | Captura de coordenadas GPS |

---

## 3. Resultados

### 3.1 Interface e Usabilidade

O *Filminho* apresenta um tema escuro (*dark mode*) consistente com aplicativos de entretenimento modernos, como Letterboxd e IMDb. A paleta de cores principal utiliza o verde neon `#00e054` (inspirado no Letterboxd) sobre fundo preto/cinza escuro, conferindo visual cinematográfico e reduzindo a fadiga visual em ambientes com pouca luz.

A navegação por abas inferiores (TabBar) segue as diretrizes do Material Design para Android, permitindo acesso imediato às duas seções principais do aplicativo. O scroll horizontal dos pôsteres e o popup de detalhes com backdrop do filme criam uma experiência imersiva.

### 3.2 Desempenho das Operações CRUD

As operações de escrita e leitura no `localStorage` são síncronas e têm tempo de resposta inferior a 1ms para coleções de até algumas centenas de avaliações, suficiente para o escopo de uso pessoal da aplicação. A serialização JSON garante interoperabilidade e facilidade de depuração.

O mecanismo de ID via `Date.now()` gera identificadores únicos com resolução em milissegundos. Para evitar colisões na migração de registros antigos sem ID, o servidor backend utiliza `Date.now() + index` como identificador de migração.

### 3.3 Integração com Hardware do Dispositivo

A implementação da captura de foto via `navigator.mediaDevices.getUserMedia()` e a coleta de geolocalização via `navigator.geolocation.getCurrentPosition()` demonstram como o Apache Cordova, combinado com APIs modernas do navegador, permite acesso transparente ao hardware do dispositivo sem necessidade de plugins adicionais em contextos web.

O tratamento de erros foi implementado para os cenários de permissão negada (`NotAllowedError`), contexto inseguro (HTTP) e timeout de geolocalização, garantindo feedback claro ao usuário em cada situação.

### 3.4 Estrutura de Dados no Servidor

O backend utiliza um arquivo JSON (`banco_filminho.json`) como banco de dados simplificado, com as seguintes coleções:

```json
{
  "usuarios": [
    { "id": 1, "nome": "Oliver Henrique" }
  ],
  "avaliacoes": [
    {
      "id_avaliacao": 1714234567890,
      "id_usuario": 1,
      "id_filme": 550,
      "titulo_filme": "Clube da Luta",
      "nota": 4.5,
      "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "reassistido": false,
      "foto": null,
      "localizacao": null
    }
  ]
}
```

Essa abordagem é adequada para a fase de prototipação e uso individual, mas poderia ser substituída por um banco de dados relacional (SQLite, PostgreSQL) ou NoSQL (MongoDB) em uma versão de produção.

---

## 4. Conclusão

O desenvolvimento do *Filminho* proporcionou aprendizado prático em múltiplas camadas do desenvolvimento de software. A escolha do Apache Cordova permitiu reutilizar o conhecimento em HTML, CSS e JavaScript para gerar um aplicativo móvel, eliminando a curva de aprendizado de linguagens nativas como Kotlin ou Swift. O Framework7 demonstrou ser uma solução madura e completa para criação de interfaces móveis com aparência nativa.

A organização do código em classes (`model.js` e `manager.js`) evidenciou os benefícios da programação orientada a objetos: separação de responsabilidades, facilidade de manutenção e extensibilidade. A classe `FilminhoManager`, por exemplo, pode ser reutilizada em qualquer contexto que necessite de persistência local com `localStorage`, independentemente da interface.

Os principais desafios encontrados foram:

- **Gerenciamento de estado assíncrono:** O uso de `async/await` com `Promises` foi essencial para coordenar chamadas à API TMDB e à câmera do dispositivo sem bloquear a interface.
- **Contexto seguro para a câmera:** A API `getUserMedia` exige HTTPS em produção, o que demandou atenção ao ambiente de deploy.
- **Migração de dados:** A adição retroativa do campo `id_avaliacao` a registros antigos exigiu a implementação de um script de migração no servidor.

Como trabalhos futuros, sugere-se: (1) a implementação de sincronização offline-first com IndexedDB e Service Workers; (2) a adição de autenticação de usuários com JWT; (3) a criação de listas de "quero assistir"; e (4) o suporte a séries de televisão via API do TMDB.

Este projeto confirmou que as tecnologias web modernas, aliadas a frameworks especializados, são capazes de produzir aplicativos móveis funcionais, com excelente experiência de usuário e em tempo de desenvolvimento significativamente menor do que o desenvolvimento nativo.

---

## Referências

APACHE CORDOVA. **Apache Cordova Documentation**. 2024. Disponível em: <https://cordova.apache.org/docs/en/latest/>. Acesso em: 27 abr. 2026.

FRAMEWORK7. **Framework7 – Full Featured Mobile HTML Framework**. 2024. Disponível em: <https://framework7.io/>. Acesso em: 27 abr. 2026.

MDN WEB DOCS. **Window: localStorage property**. Mozilla Developer Network, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>. Acesso em: 27 abr. 2026.

MDN WEB DOCS. **MediaDevices.getUserMedia()**. Mozilla Developer Network, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia>. Acesso em: 27 abr. 2026.

MDN WEB DOCS. **Geolocation API**. Mozilla Developer Network, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API>. Acesso em: 27 abr. 2026.

STATISTA. **Number of mobile app downloads worldwide from 2016 to 2024**. 2024. Disponível em: <https://www.statista.com/statistics/271644/worldwide-free-and-paid-mobile-app-store-downloads/>. Acesso em: 27 abr. 2026.

THE MOVIE DATABASE. **TMDB API Documentation**. 2024. Disponível em: <https://developer.themoviedb.org/docs>. Acesso em: 27 abr. 2026.

MOZILLA FOUNDATION. **ECMAScript 2015 (ES6) Classes**. MDN Web Docs, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes>. Acesso em: 27 abr. 2026.

MARTIN, Robert C. **Arquitetura Limpa: O guia do artesão para estrutura e design de software**. Rio de Janeiro: Alta Books, 2019.

FLING, Brian. **Mobile Design and Development**. Sebastopol: O'Reilly Media, 2009.
