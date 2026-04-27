/**
 * manager.js — FilminhoManager
 * Encapsula todas as operações CRUD sobre avaliações e perfil do usuário,
 * utilizando localStorage como mecanismo de persistência local.
 */

class FilminhoManager {
    /**
     * @param {string} [chaveAvaliacoes='filminho_avaliacoes'] - Chave no localStorage para as avaliações.
     * @param {string} [chavePerfil='filminho_perfil'] - Chave no localStorage para o perfil do usuário.
     */
    constructor(chaveAvaliacoes = 'filminho_avaliacoes', chavePerfil = 'filminho_perfil') {
        this._chaveAvaliacoes = chaveAvaliacoes;
        this._chavePerfil = chavePerfil;
    }

    // ─────────────────────────────────────────────
    // Helpers internos
    // ─────────────────────────────────────────────

    _lerAvaliacoes() {
        try {
            const json = localStorage.getItem(this._chaveAvaliacoes);
            return json ? JSON.parse(json) : [];
        } catch {
            return [];
        }
    }

    _salvarAvaliacoes(lista) {
        localStorage.setItem(this._chaveAvaliacoes, JSON.stringify(lista));
    }

    // ─────────────────────────────────────────────
    // CRUD de Avaliações
    // ─────────────────────────────────────────────

    /**
     * Retorna todas as avaliações armazenadas como instâncias de Avaliacao.
     * @returns {Avaliacao[]}
     */
    listarAvaliacoes() {
        return this._lerAvaliacoes().map(dados => new Avaliacao(dados));
    }

    /**
     * Busca uma avaliação pelo seu ID.
     * @param {number} id_avaliacao
     * @returns {Avaliacao|null}
     */
    buscarAvaliacaoPorId(id_avaliacao) {
        const dados = this._lerAvaliacoes().find(a => a.id_avaliacao === id_avaliacao);
        return dados ? new Avaliacao(dados) : null;
    }

    /**
     * Adiciona uma nova avaliação ao armazenamento.
     * O id_avaliacao é gerado automaticamente se não informado.
     * @param {Object|Avaliacao} dadosAvaliacao
     * @returns {Avaliacao} A avaliação inserida.
     */
    adicionarAvaliacao(dadosAvaliacao) {
        const lista = this._lerAvaliacoes();
        const novaAvaliacao = new Avaliacao({
            id_avaliacao: Date.now(),
            ...dadosAvaliacao
        });
        lista.push(novaAvaliacao);
        this._salvarAvaliacoes(lista);
        return novaAvaliacao;
    }

    /**
     * Atualiza os campos de uma avaliação existente pelo ID.
     * @param {number} id_avaliacao
     * @param {Object} novos_dados - Campos a serem atualizados.
     * @returns {Avaliacao|null} A avaliação atualizada ou null se não encontrada.
     */
    atualizarAvaliacao(id_avaliacao, novos_dados) {
        const lista = this._lerAvaliacoes();
        const indice = lista.findIndex(a => a.id_avaliacao === id_avaliacao);
        if (indice === -1) return null;

        lista[indice] = { ...lista[indice], ...novos_dados, id_avaliacao };
        this._salvarAvaliacoes(lista);
        return new Avaliacao(lista[indice]);
    }

    /**
     * Remove uma avaliação pelo ID.
     * @param {number} id_avaliacao
     * @returns {boolean} true se removida, false se não encontrada.
     */
    removerAvaliacao(id_avaliacao) {
        const lista = this._lerAvaliacoes();
        const novaLista = lista.filter(a => a.id_avaliacao !== id_avaliacao);
        if (novaLista.length === lista.length) return false;
        this._salvarAvaliacoes(novaLista);
        return true;
    }

    /**
     * Remove todas as avaliações armazenadas.
     */
    limparAvaliacoes() {
        this._salvarAvaliacoes([]);
    }

    // ─────────────────────────────────────────────
    // Perfil do usuário
    // ─────────────────────────────────────────────

    /**
     * Carrega o perfil do usuário do localStorage.
     * @returns {{nome: string}}
     */
    carregarPerfil() {
        try {
            const json = localStorage.getItem(this._chavePerfil);
            return json ? JSON.parse(json) : { nome: '' };
        } catch {
            return { nome: '' };
        }
    }

    /**
     * Salva o perfil do usuário no localStorage.
     * @param {{nome: string}} perfil
     */
    salvarPerfil(perfil) {
        localStorage.setItem(this._chavePerfil, JSON.stringify(perfil));
    }

    /**
     * Atualiza apenas o nome do usuário.
     * @param {string} nome
     */
    atualizarNome(nome) {
        const perfil = this.carregarPerfil();
        perfil.nome = nome;
        this.salvarPerfil(perfil);
    }
}
