/* ============================================
   SERVIÇO DE CONSULTA DE CEP (ViaCEP API)
   
   Módulo que encapsula toda a lógica de
   comunicação com a API pública do ViaCEP.
   Expõe apenas a função pública 'buscar'.
   ============================================ */

const ViaCepService = (() => {

    const BASE_URL = "https://viacep.com.br/ws";

    /* Remove caracteres não numéricos de uma string */
    function sanitizar(cep) {
        return cep.replace(/\D/g, "");
    }

    /* Valida se o CEP possui exatamente 8 dígitos numéricos */
    function validar(cep) {
        return /^\d{8}$/.test(cep);
    }

    /**
     * Consulta um CEP na API do ViaCEP.
     * @param {string} cep - CEP informado pelo usuário (com ou sem formatação)
     * @returns {Promise<Object>} Objeto com os dados do endereço
     * @throws {Error} Se o CEP for inválido, não encontrado ou houver falha de rede
     */
    async function buscar(cep) {
        const cepLimpo = sanitizar(cep);

        if (!validar(cepLimpo)) {
            throw new Error("CEP inválido. Informe os 8 dígitos do CEP.");
        }

        const response = await fetch(`${BASE_URL}/${cepLimpo}/json/`);

        if (!response.ok) {
            throw new Error("Não foi possível consultar o CEP. Tente novamente.");
        }

        const dados = await response.json();

        if (dados.erro) {
            throw new Error("CEP não encontrado.");
        }

        return dados;
    }

    return { buscar };

})();