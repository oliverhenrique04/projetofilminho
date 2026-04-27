/**
 * model.js — Classes de domínio do Filminho
 * Representa as entidades principais da aplicação: Filme e Avaliacao.
 */

/**
 * Representa um filme obtido da API TMDB.
 */
class Filme {
    /**
     * @param {Object} dados - Objeto com os dados do filme.
     * @param {number} dados.id - Identificador único do filme (TMDB).
     * @param {string} dados.title - Título do filme.
     * @param {string} [dados.poster_path] - Caminho do pôster na CDN do TMDB.
     * @param {string} [dados.backdrop_path] - Caminho da imagem de fundo na CDN do TMDB.
     * @param {string} [dados.overview] - Sinopse do filme.
     * @param {string} [dados.release_date] - Data de lançamento (YYYY-MM-DD).
     * @param {number} [dados.runtime] - Duração em minutos.
     * @param {Array}  [dados.genres] - Lista de gêneros.
     */
    constructor({ id, title, poster_path = null, backdrop_path = null, overview = '', release_date = '', runtime = 0, genres = [] } = {}) {
        this.id = id;
        this.titulo = title;
        this.poster_path = poster_path;
        this.backdrop_path = backdrop_path;
        this.sinopse = overview;
        this.data_lancamento = release_date;
        this.duracao = runtime;
        this.generos = genres;
    }

    /** Retorna o ano de lançamento extraído de data_lancamento. */
    get ano() {
        return this.data_lancamento ? this.data_lancamento.substring(0, 4) : '';
    }

    /** Retorna a URL completa do pôster em resolução w200. */
    get urlPoster() {
        return this.poster_path
            ? `https://image.tmdb.org/t/p/w200${this.poster_path}`
            : 'https://via.placeholder.com/100x150?text=Sem+Capa';
    }

    /** Retorna a URL completa da imagem de fundo em resolução w500. */
    get urlBackdrop() {
        return this.backdrop_path
            ? `https://image.tmdb.org/t/p/w500${this.backdrop_path}`
            : '';
    }
}

/**
 * Representa uma avaliação de filme registrada pelo usuário.
 */
class Avaliacao {
    /**
     * @param {Object} dados - Objeto com os dados da avaliação.
     * @param {number} [dados.id_avaliacao] - Identificador único da avaliação.
     * @param {number} dados.id_usuario - ID do usuário que avaliou.
     * @param {number} dados.id_filme - ID do filme avaliado.
     * @param {string} dados.titulo_filme - Título do filme avaliado.
     * @param {number} dados.nota - Nota atribuída (0.5 a 5.0).
     * @param {string} [dados.poster_path] - Caminho do pôster do filme avaliado.
     * @param {boolean} [dados.reassistido] - Indica se o usuário já havia assistido antes.
     * @param {string|null} [dados.foto] - Foto em base64 associada à avaliação.
     * @param {{lat: number, lon: number}|null} [dados.localizacao] - Localização geográfica no momento da avaliação.
     * @param {string} [dados.data] - Data/hora da avaliação (ISO 8601).
     */
    constructor({
        id_avaliacao = Date.now(),
        id_usuario,
        id_filme,
        titulo_filme,
        nota,
        poster_path = null,
        reassistido = false,
        foto = null,
        localizacao = null,
        data = new Date().toISOString()
    } = {}) {
        this.id_avaliacao = id_avaliacao;
        this.id_usuario = id_usuario;
        this.id_filme = id_filme;
        this.titulo_filme = titulo_filme;
        this.nota = nota;
        this.poster_path = poster_path;
        this.reassistido = !!reassistido;
        this.foto = foto;
        this.localizacao = localizacao;
        this.data = data;
    }

    /** Retorna a nota formatada com uma casa decimal. */
    get notaFormatada() {
        return typeof this.nota === 'number' ? this.nota.toFixed(1) : 'N/A';
    }

    /** Retorna a URL completa do pôster em resolução w200. */
    get urlPoster() {
        return this.poster_path
            ? `https://image.tmdb.org/t/p/w200${this.poster_path}`
            : '';
    }
}
