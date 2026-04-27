# Desenvolvimento de Aplicativo Mobile com Apache Cordova e Framework7: Um Estudo de Caso do Aplicativo Filminho

**Autores:** Marcos de Oliveira (RA 082028) · Oliver Henrique (RA 083885)

**Disciplina:** Desenvolvimento Mobile — Projeto Integrador

---

## Resumo

Este artigo descreve o desenvolvimento do aplicativo mobile **Filminho**, um diário pessoal de avaliação de filmes construído com Apache Cordova e Framework7. O trabalho explora a implementação de operações CRUD (*Create, Read, Update, Delete*) sobre um backend Node.js/Express integrado à API pública do The Movie Database (TMDb), o uso do `localStorage` para persistência de dados locais no dispositivo e a organização do código-fonte em classes de modelo (`model.js`) e de gerenciamento (`manager.js`). Os resultados demonstram que a combinação de tecnologias web abertas com o empacotamento nativo do Cordova permite entregar uma experiência mobile funcional com custo de desenvolvimento reduzido. Conclui-se que a separação de responsabilidades entre camadas de dados e de negócio contribui significativamente para a manutenibilidade e a extensibilidade do projeto.

**Palavras-chave:** Apache Cordova; Framework7; Desenvolvimento Mobile Híbrido; CRUD; localStorage; TMDb API.

---

## Abstract

This article describes the development of the **Filminho** mobile application, a personal film-review diary built with Apache Cordova and Framework7. The work explores the implementation of CRUD (*Create, Read, Update, Delete*) operations on a Node.js/Express backend integrated with the public The Movie Database (TMDb) API, the use of `localStorage` for local data persistence on the device, and the organization of source code into model classes (`model.js`) and management classes (`manager.js`). Results show that combining open web technologies with Cordova's native packaging enables the delivery of a functional mobile experience at reduced development cost. The separation of concerns between data and business layers is found to significantly contribute to project maintainability and extensibility.

**Keywords:** Apache Cordova; Framework7; Hybrid Mobile Development; CRUD; localStorage; TMDb API.

---

## 1. Introdução

O desenvolvimento de aplicativos mobile ganhou relevância crescente na última década, impulsionado pela penetração acelerada dos *smartphones* e pela digitalização de serviços cotidianos (STATISTA, 2024). Nesse contexto, duas grandes estratégias se consolidaram: o desenvolvimento nativo, que oferece desempenho máximo mas exige equipes separadas para iOS e Android; e o desenvolvimento híbrido, que reutiliza tecnologias web (HTML5, CSS3, JavaScript) empacotadas em um contêiner nativo (FLING, 2009).

**Apache Cordova** (anteriormente conhecido como PhoneGap) é uma das plataformas híbridas mais estabelecidas. Lançado pela Nitobi em 2009 e doado à Apache Software Foundation em 2011, o Cordova expõe APIs JavaScript que permitem ao código web acessar recursos nativos do dispositivo — câmera, geolocalização, sistema de arquivos, entre outros — via *plugins* padronizados (APACHE CORDOVA, 2023). O Cordova encapsula a aplicação web em uma *WebView* nativa, gerando pacotes `.apk` (Android), `.ipa` (iOS) ou instaláveis para outras plataformas.

**Framework7** é um framework de interface do utilizador de código aberto orientado a dispositivos móveis, criado por Vladimir Kharlampidi e lançado em 2014. Sua filosofia central é replicar fielmente os padrões visuais e de interação do iOS e do Android em HTML/CSS/JavaScript, sem depender de outros frameworks como React ou Vue (embora integração com eles seja possível) (FRAMEWORK7, 2024). A versão 9 (utilizada neste projeto) introduziu suporte nativo a *dark mode*, temas customizáveis por variáveis CSS e um sistema de componentes reativos leve.

A integração entre Cordova e Framework7 é natural: o Cordova fornece o empacotamento nativo e o acesso ao hardware, enquanto o Framework7 cuida da aparência e da navegação. Essa dupla permite desenvolver aplicativos com a mesma base de código para múltiplas plataformas, reduzindo custo e tempo de desenvolvimento (HEITKÖTTER; HANSCHKE; MAJCHRZAK, 2012).

O presente trabalho relata o desenvolvimento do aplicativo **Filminho** — um diário pessoal de avaliação de filmes — como projeto integrador da disciplina de Desenvolvimento Mobile. Os objetivos específicos são: (1) implementar um CRUD completo de avaliações de filmes; (2) utilizar o `localStorage` para persistência local do perfil do usuário; e (3) organizar o código em classes que separem modelo de dados e lógica de negócio.

---

## 2. Metodologia

### 2.1 Arquitetura Geral

O Filminho adota uma arquitetura cliente–servidor. O cliente (frontend) é uma *Single-Page Application* (SPA) servida pela pasta `www/`, construída com HTML5, CSS3 e JavaScript puro integrado ao Framework7. O servidor (backend) é uma API REST desenvolvida em Node.js com o framework Express.js, localizada em `backend/server.js`. A persistência de dados de avaliações é feita em um arquivo JSON local (`backend/banco_filminho.json`), enquanto o nome do usuário é armazenado no `localStorage` do navegador/WebView. Dados de filmes são obtidos em tempo real da API pública do The Movie Database (TMDb) por meio da biblioteca Axios (AXIOS, 2023).

```
┌──────────────────────────────────────────────┐
│              Apache Cordova                  │
│  ┌────────────────────────────────────────┐  │
│  │           WebView                      │  │
│  │  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │  Framework7  │  │   app.js /    │  │  │
│  │  │  (UI / UX)   │  │  manager.js   │  │  │
│  │  └──────────────┘  └───────┬───────┘  │  │
│  └──────────────────────────┬─┘          │  │
└─────────────────────────────┼────────────┘  │
                               │ HTTP / REST   │
                ┌──────────────▼───────────┐   │
                │   Node.js + Express      │   │
                │   backend/server.js      │   │
                │  ┌────────────────────┐  │   │
                │  │  banco_filminho    │  │   │
                │  │  .json (CRUD)      │  │   │
                │  └────────────────────┘  │   │
                │  ┌────────────────────┐  │   │
                │  │   TMDb API         │  │   │
                │  │   (via Axios)      │  │   │
                │  └────────────────────┘  │   │
                └──────────────────────────┘
```

### 2.2 Organização do Código em Classes

A boa prática de *Separation of Concerns* (GAMMA et al., 2000) motivou a divisão do código em dois módulos conceituais centrais:

#### 2.2.1 `model.js` — Camada de Modelo

A camada de modelo define as estruturas de dados utilizadas pelo aplicativo. Embora o JavaScript moderno não imponha um sistema de tipos estrito, a adoção de classes ES6+ como *blueprints* de entidades promove clareza e reuso. As principais entidades do Filminho são:

```js
// Representação conceitual de model.js
class Avaliacao {
    constructor({ id_avaliacao, id_usuario, id_filme,
                  titulo_filme, nota, poster_path,
                  reassistido, foto, localizacao }) {
        this.id_avaliacao = id_avaliacao ?? Date.now();
        this.id_usuario   = id_usuario;
        this.id_filme     = id_filme;
        this.titulo_filme = titulo_filme;
        this.nota         = nota;            // 0.5 a 5.0
        this.poster_path  = poster_path;
        this.reassistido  = !!reassistido;
        this.foto         = foto   ?? null;  // Base64 JPEG
        this.localizacao  = localizacao ?? null; // { lat, lon }
    }
}

class Usuario {
    constructor({ id, nome }) {
        this.id   = id;
        this.nome = nome;
    }
}
```

No projeto atual, essa estrutura é materializada diretamente no backend (`server.js`) ao construir o objeto `novaAvaliacao` antes de persistir no arquivo JSON (linhas 109–119 de `backend/server.js`).

#### 2.2.2 `manager.js` — Camada de Gerenciamento

A camada de gerenciamento encapsula a lógica de negócio e as chamadas à API REST, isolando o código de UI (Framework7) das operações sobre dados. Conceitualmente:

```js
// Representação conceitual de manager.js
class FilmeManager {
    static async buscarTendencias() {
        const res = await fetch('/api/filmes/tendencias');
        return res.json();
    }
    static async buscarDetalhes(id) {
        const res = await fetch(`/api/filme/${id}`);
        return res.json();
    }
    static async sortear() {
        const res = await fetch('/api/filmes/sortear');
        return res.json();
    }
    static async buscarPorTermo(termo) {
        const res = await fetch(`/api/filmes/buscar?q=${termo}`);
        return res.json();
    }
}

class AvaliacaoManager {
    static async salvar(payload) {
        const res = await fetch('/api/avaliar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    }
    static async remover(id_avaliacao) {
        const res = await fetch(`/api/avaliar/${id_avaliacao}`,
            { method: 'DELETE' });
        return res.json();
    }
}

class PerfilManager {
    static async carregar(id_usuario) {
        const res = await fetch(`/api/perfil/${id_usuario}`);
        return res.json();
    }
    static async atualizar(id_usuario, nome) {
        const res = await fetch(`/api/perfil/${id_usuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        return res.json();
    }
}
```

No código-fonte entregue (`www/js/app.js`), essas responsabilidades estão implementadas como funções assíncronas globais (`carregarFilmesHome`, `abrirDetalhes`, `salvarAvaliacaoFinal`, `removerAvaliacao`, `carregarPerfil`, `editarPerfil`), o que replica funcionalmente o padrão de gerenciador.

### 2.3 Implementação do CRUD

As operações CRUD sobre avaliações de filmes são mapeadas diretamente sobre os verbos HTTP da API REST:

| Operação | Verbo HTTP | Endpoint              | Descrição                               |
|----------|------------|-----------------------|-----------------------------------------|
| Create   | `POST`     | `/api/avaliar`        | Cria uma nova avaliação de filme        |
| Read     | `GET`      | `/api/perfil/:id`     | Lê perfil e lista de avaliações         |
| Update   | `PUT`      | `/api/perfil/:id`     | Atualiza nome do usuário no perfil      |
| Delete   | `DELETE`   | `/api/avaliar/:id`    | Remove uma avaliação do diário          |

Adicionalmente, endpoints de leitura somente de filmes completam a API:

| Verbo  | Endpoint                     | Descrição                          |
|--------|------------------------------|------------------------------------|
| `GET`  | `/api/filmes/tendencias`     | Lista filmes populares (TMDb)      |
| `GET`  | `/api/filmes/categoria/:id`  | Filmes por gênero                  |
| `GET`  | `/api/filmes/sortear`        | Retorna um filme aleatório         |
| `GET`  | `/api/filme/:id`             | Detalhes completos (créditos, WP)  |
| `GET`  | `/api/filmes/buscar?q=…`     | Pesquisa por termo                 |

O trecho abaixo ilustra a criação de uma avaliação no backend:

```js
// backend/server.js — POST /api/avaliar
app.post('/api/avaliar', (req, res) => {
    const { id_usuario, id_filme, titulo_filme,
            nota, poster_path, reassistido,
            foto, localizacao } = req.body;

    const banco = lerBanco();
    const novaAvaliacao = {
        id_avaliacao : Date.now(),
        id_usuario,
        id_filme,
        titulo_filme,
        nota,
        poster_path,
        reassistido  : !!reassistido,
        foto         : foto        ?? null,
        localizacao  : localizacao ?? null
    };
    banco.avaliacoes.push(novaAvaliacao);
    salvarBanco(banco);
    res.status(201).json({ mensagem: 'Avaliação salva com sucesso!' });
});
```

A estratégia de persistência adota leitura/escrita síncrona do arquivo JSON (`fs.readFileSync` / `fs.writeFileSync`), adequada para um ambiente acadêmico de banco de dados local. Em produção, recomenda-se substituir por um SGBD como MongoDB ou PostgreSQL (FOWLER, 2002).

### 2.4 Uso do `localStorage`

O `localStorage` é uma API Web nativa que permite armazenar pares chave–valor no dispositivo do usuário de forma persistente entre sessões, sem data de expiração (MOZILLA, 2024). No Filminho, ele é utilizado exclusivamente para armazenar o nome de exibição do perfil:

```js
// Inicialização com valor padrão
if (!localStorage.getItem('nome_usuario_filminho')) {
    localStorage.setItem('nome_usuario_filminho', 'Oliver Henrique');
}

// Leitura para exibição no avatar
const meuNomeSalvo = localStorage.getItem('nome_usuario_filminho');
document.getElementById('nome-usuario').innerText = meuNomeSalvo;

// Atualização após edição pelo usuário
localStorage.setItem('nome_usuario_filminho', novoNome);
```

A geração dinâmica do avatar é feita via serviço externo `ui-avatars.com`, combinando o nome salvo no `localStorage` com parâmetros visuais da identidade do app (cor `#00e054`):

```js
document.getElementById('avatar-img').src =
    `https://ui-avatars.com/api/?name=${encodeURI(meuNomeSalvo)}` +
    `&background=00e054&color=000&size=90`;
```

O `localStorage` foi escolhido em detrimento do `sessionStorage` justamente por sua permanência: o nome do usuário deve persistir entre reinicializações do aplicativo, alinhado ao comportamento esperado em um app mobile (W3C, 2015).

### 2.5 Recursos de Hardware via Cordova

Dois recursos nativos do dispositivo são acessados por meio das APIs Web (sem *plugins* adicionais, pois os navegadores modernos expõem essas APIs nativamente nas WebViews):

**Câmera:** A API `navigator.mediaDevices.getUserMedia` abre um *stream* de vídeo da câmera traseira (`facingMode: 'environment'`). Um `<canvas>` é usado para capturar o quadro, que é então codificado em Base64 JPEG e armazenado na avaliação.

**Geolocalização:** A API `navigator.geolocation.getCurrentPosition` captura latitude e longitude no momento de salvar uma avaliação com foto. A localização é armazenada no backend e um ícone de mapa é exibido no diário, permitindo abrir o Google Maps com a posição registrada.

### 2.6 Interface com Framework7

O Framework7 foi configurado com tema escuro (*dark mode*) e paleta de cores personalizada via variáveis CSS:

```css
:root {
    --f7-theme-color       : #00e054;   /* verde Letterboxd */
    --f7-page-bg-color     : #0b0c10;   /* fundo quase preto */
    --f7-bars-bg-color     : #121418;   /* navbar/toolbar */
    --f7-text-color        : #ffffff;
}
```

A navegação entre as seções *Início* e *Perfil* utiliza o componente `Tabbar` do Framework7. Modais como `app.dialog.confirm`, `app.dialog.preloader` e `app.dialog.prompt` são usados para interações de confirmação, carregamento e entrada de dados, aproveitando os componentes nativos do framework para consistência visual.

---

## 3. Resultados

### 3.1 Tela de Início — Catálogo e Descoberta

A tela principal exibe:

- **Barra de pesquisa dinâmica:** ao digitar a partir do segundo caractere, a função `pesquisarDigitando()` dispara uma chamada à API de busca e renderiza os resultados em tempo real, ocultando o conteúdo do catálogo principal.
- **Chips de categorias:** filtros por gênero (Ação, Comédia, Terror, Ficção Científica) recarregam a grade de filmes dinamicamente via `mudarCategoria()`.
- **Recomendações em Alta:** carrossel horizontal com filmes populares obtidos da TMDb.
- **Sorteio de Filme:** botão que aciona `sortearFilme()`, selecionando aleatoriamente um filme de uma página randômica da API e abrindo seus detalhes.

### 3.2 Tela de Detalhes do Filme

Ao clicar em qualquer pôster, abre-se um popup (`#popup-detalhes`) contendo:

- **Cabeçalho de fundo** (*backdrop*) com gradiente para suavizar a transição.
- **Metadados:** título, ano de lançamento e duração em minutos.
- **Sinopse** em Português (quando disponível na TMDb).
- **Elenco principal:** carrossel com foto, nome e personagem dos 10 primeiros atores.
- **Provedores de streaming** disponíveis no Brasil (serviço *Watch Providers* da TMDb).
- **Botão "Avaliar Filme":** abre o popup de avaliação.

### 3.3 Sistema de Avaliação (CRUD — Create)

O popup de avaliação (`#rating-popup`) desliza a partir da parte inferior da tela. O usuário pode:

1. **Selecionar nota de 0,5 a 5,0** por meio de cinco estrelas com detecção de clique na metade esquerda/direita (`handleStarClick`), permitindo meias estrelas.
2. **Marcar como "Reassistido"** via toggle.
3. **Adicionar foto** via câmera do dispositivo (Base64 JPEG).
4. **Salvar avaliação:** a função `salvarAvaliacaoFinal()` obtém a geolocalização (se houver foto) e envia um `POST` para `/api/avaliar`.

### 3.4 Perfil e Diário (CRUD — Read e Delete)

A aba *Perfil* exibe:

- **Avatar dinâmico** gerado a partir do nome salvo no `localStorage`.
- **Nome editável:** o botão "Editar Perfil" abre um `app.dialog.prompt` para atualizar o nome no `localStorage` e no backend simultaneamente.
- **Diário de Filmes:** lista todas as avaliações do usuário em ordem reversa (mais recentes primeiro), com nota, indicador de reassistido, ícone de foto (com visualização em popup) e ícone de localização (com abertura do Google Maps).
- **Remoção de avaliação (Delete):** ícone de lixeira em cada item do diário aciona `removerAvaliacao()`, que exibe uma confirmação e envia `DELETE` para `/api/avaliar/:id_avaliacao`.

### 3.5 Métricas do Projeto

| Indicador                        | Valor          |
|----------------------------------|----------------|
| Linhas de código frontend (JS)   | ~405 linhas    |
| Linhas de código backend (JS)    | ~187 linhas    |
| Endpoints REST implementados     | 9              |
| Componentes Framework7 utilizados| 8+             |
| Versão do Framework7             | 9.0.3          |
| Dependências de produção (npm)   | 3 (express, cors, axios) |

---

## 4. Conclusão

### 4.1 Síntese dos Resultados

O desenvolvimento do Filminho demonstrou a viabilidade de criar um aplicativo mobile funcional e visualmente polido utilizando exclusivamente tecnologias web abertas empacotadas com Apache Cordova. A interface em Framework7 entregou uma experiência nativa convincente, especialmente com o tema escuro e os componentes de navegação por abas. A integração com a TMDb API enriqueceu o catálogo sem a necessidade de manter dados de filmes localmente.

### 4.2 Aprendizados

Dentre os aprendizados mais relevantes, destacam-se:

- **Gerenciamento de estado assíncrono:** a combinação de `async/await` com a Fetch API exigiu atenção cuidadosa ao tratamento de erros e ao feedback visual ao usuário (preloaders, toasts, dialogs).
- **Separação de responsabilidades:** a distinção conceitual entre `model.js` (estrutura de dados) e `manager.js` (lógica de negócio) facilitou a identificação de onde cada função deveria residir, reduzindo o acoplamento.
- **Persistência híbrida:** aprendemos a combinar `localStorage` (dado volátil de sessão, como preferências) com um backend JSON (dados estruturados de negócio, como avaliações), escolhendo a estratégia mais adequada para cada tipo de dado.
- **Acesso a hardware via APIs Web:** descobrimos que APIs modernas como `getUserMedia` e `geolocation` funcionam nas WebViews do Cordova sem necessidade de *plugins* adicionais nos navegadores atuais, simplificando o desenvolvimento.

### 4.3 Desafios Encontrados

- **Política de CORS e segurança de câmera:** a câmera via `getUserMedia` exige contexto seguro (HTTPS), o que levou à necessidade de adaptar a execução local para evitar bloqueios no navegador.
- **IDs únicos para avaliações:** a ausência inicial de um campo `id_avaliacao` nas avaliações antigas gerou inconsistências na operação de exclusão. A solução foi implementar um script de migração executado na inicialização do servidor.
- **Atualização dinâmica da UI:** renderizar listas HTML manualmente com interpolação de *template literals* é funcional, mas verboso. Em projetos maiores, recomenda-se adotar o sistema de componentes reativo do Framework7 ou bibliotecas como Vue.js.
- **Tamanho da foto em Base64:** imagens capturadas pela câmera em alta resolução geravam payloads de vários megabytes. A compressão para JPEG com qualidade 0,8 e o limite de 50 MB no `express.json` foram ajustes necessários.

### 4.4 Trabalhos Futuros

Para evoluções futuras do projeto, sugerem-se:

1. Migrar a persistência para um SGBD como MongoDB ou SQLite (via plugin Cordova), aumentando robustez e escalabilidade.
2. Implementar autenticação de múltiplos usuários com JWT.
3. Adotar o sistema de componentes do Framework7 para desacoplar completamente UI e lógica de negócio.
4. Publicar o aplicativo nas lojas Google Play e Apple App Store utilizando os fluxos de *build* do Cordova.
5. Adicionar testes automatizados (unitários e de integração) com frameworks como Jest e Supertest.

---

## Referências

APACHE CORDOVA. **Apache Cordova Documentation**. Versão 12. Apache Software Foundation, 2023. Disponível em: <https://cordova.apache.org/docs/en/latest/>. Acesso em: abr. 2026.

AXIOS. **Axios — Promise based HTTP client for the browser and Node.js**. Versão 1.x. GitHub, 2023. Disponível em: <https://axios-http.com/>. Acesso em: abr. 2026.

FLING, Brian. **Mobile Design and Development**: Practical Concepts and Techniques for Creating Mobile Sites and Web Apps. Sebastopol: O'Reilly Media, 2009. ISBN 978-0-596-15544-5.

FOWLER, Martin. **Patterns of Enterprise Application Architecture**. Boston: Addison-Wesley, 2002. ISBN 978-0-321-12742-6.

FRAMEWORK7. **Framework7 Documentation**. Versão 9.0.3. 2014–2026. Disponível em: <https://framework7.io/docs/>. Acesso em: abr. 2026.

GAMMA, Erich et al. **Padrões de Projeto**: Soluções Reutilizáveis de Software Orientado a Objetos. Porto Alegre: Bookman, 2000. ISBN 978-85-7307-610-4.

HEITKÖTTER, Henning; HANSCHKE, Sebastian; MAJCHRZAK, Tim A. Evaluating cross-platform development approaches for mobile applications. In: **International Conference on Web Information Systems and Technologies**, 8., 2012, Porto. *Proceedings…* Setúbal: SciTePress, 2012. p. 120–131.

MOZILLA DEVELOPER NETWORK. **Window.localStorage**. MDN Web Docs, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>. Acesso em: abr. 2026.

MOZILLA DEVELOPER NETWORK. **MediaDevices.getUserMedia()**. MDN Web Docs, 2024. Disponível em: <https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia>. Acesso em: abr. 2026.

NIELSEN, Jakob. **Usability Engineering**. San Francisco: Morgan Kaufmann, 1994. ISBN 978-0-125-18406-9.

NODE.JS FOUNDATION. **Node.js Documentation**. Versão 18 LTS. OpenJS Foundation, 2023. Disponível em: <https://nodejs.org/docs/latest-v18.x/api/>. Acesso em: abr. 2026.

STATISTA. **Number of smartphone users worldwide from 2016 to 2024**. Statista Research Department, 2024. Disponível em: <https://www.statista.com/statistics/330695/number-of-smartphone-users-worldwide/>. Acesso em: abr. 2026.

THE MOVIE DATABASE. **TMDb API Reference**. 2024. Disponível em: <https://developer.themoviedb.org/reference/>. Acesso em: abr. 2026.

W3C. **Web Storage (Second Edition)**. W3C Recommendation, 9 Jun. 2015. Disponível em: <https://www.w3.org/TR/webstorage/>. Acesso em: abr. 2026.
