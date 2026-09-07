document.addEventListener("DOMContentLoaded", () => {

    /* ============================================
       Constantes com os elementos HTML
       ============================================ */

    const PREFIXO_CACHE = "cep_";

    const formConsulta = document.getElementById("formConsulta");
    const inputCep = document.getElementById("inputCep");
    const btnBuscar = document.getElementById("btnBuscar");
    const cardResultado = document.getElementById("cardResultado");
    const badgeOrigem = document.getElementById("badgeOrigem");
    const alerta = document.getElementById("alerta");
    const alertaSalvos = document.getElementById("alertaSalvos");

    const camposResultado = {
        cep: document.getElementById("resultadoCep"),
        logradouro: document.getElementById("resultadoLogradouro"),
        complemento: document.getElementById("resultadoComplemento"),
        bairro: document.getElementById("resultadoBairro"),
        localidade: document.getElementById("resultadoLocalidade"),
        uf: document.getElementById("resultadoUf"),
        ddd: document.getElementById("resultadoDdd")
    };

    const navItems = document.querySelectorAll("[data-section]");
    const sections = document.querySelectorAll("[data-section-target]");
    const offcanvasEl = document.getElementById("offcanvasNav");

    const tabelaSalvos = document.getElementById("tabelaSalvos");
    const corpoTabela = document.getElementById("corpoTabela");
    const estadoVazio = document.getElementById("estadoVazio");

    let cepAtual = null;


    /* ============================================
       Bloqueio do botão de consulta e indicador de carregamento
       ============================================ */

    function setBotaoCarregando(loading) {
        btnBuscar.disabled = loading;
        btnBuscar.innerHTML = loading
            ? '<span class="spinner-border spinner-border-sm me-1"></span>Consultando...'
            : '<i class="bi bi-search"></i> Consultar CEP';
    }


    /* ============================================
       Verificação do CEP no local storage (cache local)
       ============================================ */

    function gerarChave(cep) {
        return PREFIXO_CACHE + cep.replace(/\D/g, "");
    }

    /* Verifica se um CEP existe no cache local */
    function getCacheCep(cep) {
        const dado = localStorage.getItem(gerarChave(cep));
        return dado ? JSON.parse(dado) : null;
    }

    /* Salva os dados de um CEP no cache local */
    function setCacheCep(dados) {
        localStorage.setItem(gerarChave(dados.cep), JSON.stringify(dados));
    }

    /* Percorre o localStorage e retorna todos os CEPs salvos */
    function getTodosCepsSalvos() {
        return Object.keys(localStorage)
            .filter((chave) => chave.startsWith(PREFIXO_CACHE))
            .map((chave) => JSON.parse(localStorage.getItem(chave)))
            .filter(Boolean)
            .sort((a, b) => a.cep.localeCompare(b.cep));
    }

    /* Remove um CEP específico do cache local */
    function removerCepDoCache(cepFormatado) {
        localStorage.removeItem(gerarChave(cepFormatado));
    }


    /* ============================================
       Consumo da API ViaCEP (viaCepService.js)
       ============================================ */

    async function processarConsulta(cepInformado) {
        const cepLimpo = cepInformado.replace(/\D/g, "");

        if (!/^\d{8}$/.test(cepLimpo)) {
            limparResultado();
            exibirAlerta("CEP inválido. Informe os 8 dígitos do CEP.");
            return;
        }

        setBotaoCarregando(true);

        try {
            const cache = getCacheCep(cepLimpo);

            if (cache) {
                preencherResultado(cache, "cache");
                exibirAlerta("Dados carregados do cache local.", "info");
                return;
            }

            const dados = await ViaCepService.buscar(cepInformado);
            setCacheCep(dados);
            preencherResultado(dados, "api");
            renderizarTabela();
            exibirAlerta("CEP encontrado e salvo no cache local.", "success");
        } catch (erro) {
            limparResultado();
            exibirAlerta(erro.message);
        } finally {
            setBotaoCarregando(false);
        }
    }


    /* ============================================
       RENDERIZAÇÃO NA TELA
       ============================================ */

    /* Gera uma célula <td> com conteúdo e classe opcional */
    function criarCelula(texto, classe) {
        const td = document.createElement("td");
        td.textContent = texto || "-";
        if (classe) td.className = classe;
        return td;
    }

    /* Gera a célula de ações com o botão de excluir */
    function criarBotaoExcluir(cep) {
        const td = document.createElement("td");
        td.className = "text-end";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm btn-outline-danger";
        btn.setAttribute("data-cep", cep);
        btn.innerHTML = '<i class="bi bi-trash"></i>';
        btn.title = "Remover do cache";
        td.appendChild(btn);

        return td;
    }

    /* Campos exibidos no card de resultado (mesmos nomes da API) */
    const MAPA_CAMPOS = ["cep", "logradouro", "complemento", "bairro", "localidade", "uf", "ddd"];

    /* Preenche o card de resultado e o badge de origem (cache ou API) */
    function preencherResultado(dados, origem) {
        MAPA_CAMPOS.forEach((campo) => {
            camposResultado[campo].textContent = dados[campo] || "-";
        });
        cepAtual = dados;
        cardResultado.classList.remove("d-none");
        atualizarBadge(origem);
    }

    /* Esconde o card de resultado e limpa o CEP selecionado */
    function limparResultado() {
        cardResultado.classList.add("d-none");
        cepAtual = null;
    }

    /* Atualiza o badge que indica a origem dos dados exibidos */
    function atualizarBadge(origem) {
        const configuracoes = {
            cache: { classe: "text-bg-info", texto: "Carregado do cache" },
            api: { classe: "text-bg-success", texto: "Salvo no cache automaticamente" },
            removido: { classe: "text-bg-secondary", texto: "Não salvo no cache" }
        };
        const config = configuracoes[origem] || configuracoes.cache;
        badgeOrigem.className = `badge rounded-pill ${config.classe}`;
        badgeOrigem.textContent = config.texto;
    }

    /* Monta a tabela de CEPs salvos (ou o estado vazio) */
    function renderizarTabela() {
        const salvos = getTodosCepsSalvos();
        corpoTabela.innerHTML = "";

        estadoVazio.classList.toggle("d-none", salvos.length > 0);
        tabelaSalvos.classList.toggle("d-none", salvos.length === 0);

        salvos.forEach((cep) => {
            const tr = document.createElement("tr");
            tr.append(
                criarCelula(cep.cep, "fw-semibold"),
                criarCelula(cep.logradouro),
                criarCelula(cep.bairro),
                criarCelula(cep.localidade && `${cep.localidade}/${cep.uf}`),
                criarCelula(cep.ddd),
                criarBotaoExcluir(cep.cep)
            );
            corpoTabela.appendChild(tr);
        });
    }

    /* Exibe uma mensagem de alerta no container indicado (e a esconde após segundos) */
    const TIPOS_ALERTA = ["success", "info", "warning", "danger"];
    const TIMERS_ALERTA = new WeakMap();

    function exibirAlerta(mensagem, tipo = "danger", elemento = alerta) {
        elemento.classList.remove("d-none", ...TIPOS_ALERTA.map((c) => `alert-${c}`));
        elemento.classList.add(`alert-${tipo}`);
        elemento.textContent = mensagem;

        clearTimeout(TIMERS_ALERTA.get(elemento));
        TIMERS_ALERTA.set(elemento, setTimeout(() => elemento.classList.add("d-none"), 4500));
    }

    /* Alterna a seção visível conforme o item clicado na sidebar */
    function alternarSecao(sectionId) {
        sections.forEach((sec) => {
            sec.classList.toggle("d-none", sec.dataset.sectionTarget !== sectionId);
        });
        navItems.forEach((item) => {
            item.classList.toggle("active", item.dataset.section === sectionId);
        });
        if (offcanvasEl && window.bootstrap) {
            const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
            if (offcanvas) offcanvas.hide();
        }
    }


    /* ============================================
       EVENTOS
       ============================================ */

    /* Máscara do campo CEP: aceita apenas números e aplica "00000-000" */
    inputCep.addEventListener("input", () => {
        let valor = inputCep.value.replace(/\D/g, "").slice(0, 8);
        if (valor.length > 5) valor = valor.slice(0, 5) + "-" + valor.slice(5);
        inputCep.value = valor;
    });

    /* Submissão do formulário de consulta */
    formConsulta.addEventListener("submit", (evento) => {
        evento.preventDefault();
        processarConsulta(inputCep.value);
    });

    /* Exclusão de CEP pela tabela (delegação de eventos no tbody) */
    corpoTabela.addEventListener("click", (evento) => {
        const btnExcluir = evento.target.closest("[data-cep]");
        if (!btnExcluir) return;

        const cepFormatado = btnExcluir.dataset.cep;
        removerCepDoCache(cepFormatado);
        renderizarTabela();

        if (cepAtual && cepAtual.cep === cepFormatado) {
            atualizarBadge("removido");
        }

        exibirAlerta("CEP removido do cache local.", "success", alertaSalvos);
    });

    /* Navegação entre as seções da sidebar */
    navItems.forEach((item) => {
        item.addEventListener("click", () => alternarSecao(item.dataset.section));
    });

    /* Inicialização: renderiza a tabela de CEPs salvos ao carregar a página */
    renderizarTabela();

});