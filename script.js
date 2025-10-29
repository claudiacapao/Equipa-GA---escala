// ==========================================================
// DADOS INICIAIS E ESTADO
// ==========================================================

const EQUIPA_BASE = {
    sonia: "Sónia Constantino", 
    rafael: "Rafael Pinto", 
    andre: "André Falé" 
};

const TODOS_COLABORADORES = {
    sonia: "Sónia Constantino", 
    rafael: "Rafael Pinto", 
    andre: "André Falé",
    hayanna: "Hayanna do Valle", 
    ana_v: "Ana Villalobos", 
    sofia: "Sofia Gonçalves", 
    marta: "Marta Pereiro", 
    mario: "Mario Fonseca", 
    laura: "Laura Fernandes", 
    cintia: "Cintia Lopes", 
    ana_m: "Ana Marques",
    carolina_c: "Carolina C."
};

const DIAS_UTEIS_NOVEMBRO = [
    3, 4, 5, 6, 7,      // Semana 1
    10, 11, 12, 13, 14, // Semana 2
    17, 18, 19, 20, 21, // Semana 3
    24, 25, 26, 27, 28  // Semana 4
];
const DIAS_FIXOS_REMOTO_NA_SEMANA = [0, 2, 4]; // Seg, Qua, Sex

let estadoRemoto = {}; 
let modoTroca = 'dia'; 
let estadoAusenciaPorDia = {}; 

// NOVAS CONSTANTES PARA PERSISTÊNCIA
const STORAGE_KEY_REMOTO = 'equipaRotacaoRemoto';
const STORAGE_KEY_AUSENCIA = 'equipaAusenciaPorDia';


// ==========================================================
// FUNÇÕES DE PERSISTÊNCIA (NOVO)
// ==========================================================

function carregarEstado() {
    const remotoString = localStorage.getItem(STORAGE_KEY_REMOTO);
    const ausenciaString = localStorage.getItem(STORAGE_KEY_AUSENCIA);
    
    if (remotoString) {
        // Carrega as trocas guardadas
        estadoRemoto = JSON.parse(remotoString);
    } else {
        estadoRemoto = {};
    }

    if (ausenciaString) {
        // Carrega as ausências guardadas
        estadoAusenciaPorDia = JSON.parse(ausenciaString);
    } else {
        estadoAusenciaPorDia = {};
    }
}

function salvarEstado() {
    // Guarda o estado de remoto e ausência
    localStorage.setItem(STORAGE_KEY_REMOTO, JSON.stringify(estadoRemoto));
    localStorage.setItem(STORAGE_KEY_AUSENCIA, JSON.stringify(estadoAusenciaPorDia));
}

function resetarEstado() {
    if (confirm("Tem a certeza que deseja limpar todas as trocas e ausências e reverter para a rotação original de Sónia, Rafael e André?")) {
        // Limpa o localStorage
        localStorage.removeItem(STORAGE_KEY_REMOTO);
        localStorage.removeItem(STORAGE_KEY_AUSENCIA);
        
        // Zera os estados em memória
        estadoRemoto = {}; 
        estadoAusenciaPorDia = {};

        // Recalcula o calendário e salva o estado inicial limpo
        inicializarCalendario(true); 
        
        document.getElementById('feedbackTroca').textContent = 'Estado reiniciado com sucesso.';
        document.getElementById('feedbackTroca').style.color = 'green';
        document.getElementById('feedbackFerias').textContent = '';
        
        // Reset dos dropdowns de Férias
        document.getElementById('membroAusente').value = '';
        document.getElementById('substituto').value = '';
    }
}


// ==========================================================
// FUNÇÕES DE UTILIDADE E VALIDAÇÃO (mantidas)
// ==========================================================

function getMembroPorDia(dia) {
    return estadoRemoto[dia];
}

function getNomeCompleto(slug) {
    return TODOS_COLABORADORES[slug] || '';
}

function getAusenciaParaDia(dia) {
    return estadoAusenciaPorDia[dia] || null;
}

// Verifica se a regra de 1 dia remoto por pessoa é válida para a semana de um dado dia
function validarRegrasSemanais(dia) {
    const membrosParaValidar = new Set(Object.keys(EQUIPA_BASE));
    Object.values(estadoAusenciaPorDia).forEach(a => {
        if (a.substituto) membrosParaValidar.add(a.substituto);
    });
    const equipaAtual = Array.from(membrosParaValidar);

    const indiceDia = DIAS_UTEIS_NOVEMBRO.indexOf(parseInt(dia));
    if (indiceDia === -1) return true; 

    const inicioSemana = Math.floor(indiceDia / 5) * 5;
    const diasDaSemana = DIAS_UTEIS_NOVEMBRO.slice(inicioSemana, inicioSemana + 5);

    const contagemRemotos = {};
    equipaAtual.forEach(m => contagemRemotos[m] = 0);

    diasDaSemana.forEach(d => {
        const membro = getMembroPorDia(d);
        if (membro && equipaAtual.includes(membro)) { 
            contagemRemotos[membro]++;
        }
    });

    for (const membro in contagemRemotos) {
        if (contagemRemotos[membro] > 1) {
            return false;
        }
    }
    return true;
}


// ==========================================================
// FUNÇÃO PRINCIPAL: INICIALIZAÇÃO E ROTAÇÃO DINÂMICA
// ==========================================================

// O flag 'forcarRecalculo' é usado para aplicar férias ou reset
function inicializarCalendario(forcarRecalculo = false) {
    
    // Se o estado remoto já está carregado do localStorage E não estamos a forçar um novo cálculo
    if (!forcarRecalculo && Object.keys(estadoRemoto).length > 0) {
        atualizarVisual();
        preencherDropdowns();
        return;
    }

    let indexEquipaRotacao = 0;
    estadoRemoto = {}; // Resetar o estado de remoto, pois vamos recalcular
    const slugsBase = Object.keys(EQUIPA_BASE); 

    // 1. GERA A ROTAÇÃO DIA A DIA 
    for (let semana = 0; semana < 4; semana++) {
        
        const inicioSemana = semana * 5;
        const diasDaSemana = DIAS_UTEIS_NOVEMBRO.slice(inicioSemana, inicioSemana + 5);
        
        DIAS_FIXOS_REMOTO_NA_SEMANA.forEach((posicaoDiaUtil) => {
            const diaDoMes = diasDaSemana[posicaoDiaUtil];
            
            if (diaDoMes) {
                
                const slugEscalado = slugsBase[indexEquipaRotacao % slugsBase.length];
                const infoAusencia = getAusenciaParaDia(diaDoMes);

                let slugFinalRemoto = slugEscalado;

                if (infoAusencia && slugEscalado === infoAusencia.ausente) {
                    if (infoAusencia.substituto) {
                        slugFinalRemoto = infoAusencia.substituto;
                    } else {
                        slugFinalRemoto = null; 
                    }
                }

                if (slugFinalRemoto) {
                    estadoRemoto[diaDoMes] = slugFinalRemoto;
                }
                
                indexEquipaRotacao++;
            }
        });
    }
    
    // 2. Persiste o novo estado e configura interface
    salvarEstado(); 
    atualizarVisual();
    preencherDropdowns();
}


// ==========================================================
// FUNÇÕES DE INTERFACE (VISUAL E FÉRIAS)
// ==========================================================

function atualizarVisual() {
    // 1. Limpa todas as marcas e classes e restaura nomes
    document.querySelectorAll('.membro').forEach(el => {
        el.classList.remove('remoto', 'presencial-destaque', 'ferias');
        el.parentElement.classList.remove('dia-remoto-atribuido', 'dia-ferias-aplicado');
        el.textContent = getNomeCompleto(el.dataset.membro); 
        el.textContent = el.textContent.replace(' ☕', '').replace(' 🌴', ''); 
    });

    // 2. Marca o estado de FÉRIAS (🌴)
    for (const dia in estadoAusenciaPorDia) {
        const ausencia = estadoAusenciaPorDia[dia];
        const slugAusente = ausencia.ausente;

        const elementoAusente = document.getElementById(`dia-${dia}-${slugAusente}`);
        if (elementoAusente) {
            elementoAusente.classList.add('ferias');
            elementoAusente.textContent += ' 🌴'; 
            elementoAusente.parentElement.classList.add('dia-ferias-aplicado');
        }
    }

    // 3. Marca o estado de REMOTO (☕) e PRESENCIAL (Azul)
    DIAS_UTEIS_NOVEMBRO.forEach(dia => {
        const slugRemoto = estadoRemoto[dia]; 

        Object.keys(TODOS_COLABORADORES).forEach(slugMembro => {
            const idElemento = `dia-${dia}-${slugMembro}`;
            const elementoMembro = document.getElementById(idElemento);
            
            if (elementoMembro) {
                // Lógica de substituição visual: troca o nome no dia de ausência
                const infoAusencia = getAusenciaParaDia(dia);
                if (infoAusencia && infoAusencia.ausente === slugMembro && infoAusencia.substituto) {
                    elementoMembro.textContent = getNomeCompleto(infoAusencia.substituto);
                } else {
                     elementoMembro.textContent = getNomeCompleto(slugMembro);
                }
                // Remove o símbolo de férias se estiver a ser reprocessado
                elementoMembro.textContent = elementoMembro.textContent.replace(' ☕', '').replace(' 🌴', ''); 


                if (slugMembro === slugRemoto) {
                    // TELETRABALHO (Verde ☕)
                    elementoMembro.classList.add('remoto');
                    elementoMembro.textContent += ' ☕'; 

                } else if (slugRemoto) {
                    // PRESENCIAL DESTACADO (Azul)
                    elementoMembro.classList.add('presencial-destaque');
                }
                
                // Volta a marcar o ausente com 🌴, se necessário
                if (infoAusencia && infoAusencia.ausente === slugMembro) {
                    elementoMembro.classList.add('ferias');
                    elementoMembro.textContent += ' 🌴';
                }
            }
        });
    });
}

function preencherDropdownsDatas() {
    const dias = DIAS_UTEIS_NOVEMBRO;
    const selectInicio = document.getElementById('diaInicio');
    const selectFim = document.getElementById('diaFim');

    [selectInicio, selectFim].forEach(select => {
        select.innerHTML = '';
        dias.forEach(dia => {
            select.innerHTML += `<option value="${dia}">${dia}</option>`;
        });
    });
}

function preencherSelectSubstitutos() {
    const select = document.getElementById('substituto');
    select.innerHTML = '<option value="">Nenhum substituto</option>';

    for (const slug in TODOS_COLABORADORES) {
        if (!EQUIPA_BASE.hasOwnProperty(slug)) {
            select.innerHTML += `<option value="${slug}">${TODOS_COLABORADORES[slug]}</option>`;
        }
    }
}

function aplicarFerias() {
    const membroAusente = document.getElementById('membroAusente').value;
    const substituto = document.getElementById('substituto').value;
    const diaInicio = parseInt(document.getElementById('diaInicio').value);
    const diaFim = parseInt(document.getElementById('diaFim').value);
    const feedback = document.getElementById('feedbackFerias');

    feedback.textContent = ''; 
    feedback.style.color = 'red';

    if (!membroAusente || isNaN(diaInicio) || isNaN(diaFim)) {
        feedback.textContent = 'Erro: Por favor, selecione um membro, um dia de início e um dia de fim.';
        return;
    }
    if (diaInicio > diaFim) {
        feedback.textContent = 'Erro: O Dia Início não pode ser superior ao Dia Fim.';
        return;
    }
    
    estadoAusenciaPorDia = {}; // Zera o estado anterior de férias

    const indiceInicio = DIAS_UTEIS_NOVEMBRO.indexOf(diaInicio);
    const indiceFim = DIAS_UTEIS_NOVEMBRO.indexOf(diaFim);
    
    if (indiceInicio === -1 || indiceFim === -1) {
        feedback.textContent = 'Erro: Os dias selecionados não são dias úteis ou não existem no calendário.';
        return;
    }

    for (let i = indiceInicio; i <= indiceFim; i++) {
        const dia = DIAS_UTEIS_NOVEMBRO[i];
        estadoAusenciaPorDia[dia] = { ausente: membroAusente, substituto: substituto || null };
    }

    // Recalcula a rotação (forçando) e salva o novo estado
    inicializarCalendario(true); 

    feedback.textContent = `Férias aplicadas: ${getNomeCompleto(membroAusente)} ausente de ${diaInicio} a ${diaFim}. ${substituto ? getNomeCompleto(substituto) + ' está na rotação.' : 'Nenhuma substituição aplicada.'}`;
    feedback.style.color = 'green';
}

function limparFerias() {
    estadoAusenciaPorDia = {};
    // Recalcula a rotação (forçando) e salva o estado sem ausências
    inicializarCalendario(true); 
    
    document.getElementById('feedbackFerias').textContent = 'Todas as ausências foram removidas.';
    document.getElementById('feedbackFerias').style.color = 'green';
}


// ==========================================================
// FUNÇÕES DE EVENTO: PROCESSAMENTO DE TROCA
// ==========================================================

function preencherDropdowns() {
    const selectOrigem = document.getElementById('diaOrigem');
    const selectDestino = document.getElementById('diaDestino');
    const labelOrigem = document.getElementById('labelOrigem');
    const labelDestino = document.getElementById('labelDestino');
    
    selectOrigem.innerHTML = '<option value="">Selecione um dia</option>';
    selectDestino.innerHTML = '<option value="">Selecione um dia</option>';

    if (modoTroca === 'dia') {
        labelOrigem.textContent = 'Dia de Origem (Remoto):';
        labelDestino.textContent = 'Dia de Destino (Presencial):';
        
        DIAS_UTEIS_NOVEMBRO.forEach(dia => {
            const membro = getMembroPorDia(dia);
            
            if (membro) { 
                const nomeMembro = getNomeCompleto(membro);
                selectOrigem.innerHTML += `<option value="${dia}">${dia} (${nomeMembro})</option>`;
            } 
            if (!membro) { 
                selectDestino.innerHTML += `<option value="${dia}">${dia}</option>`;
            }
        });

    } else { 
        labelOrigem.textContent = 'Dia de Origem (Remoto da Pessoa A):';
        labelDestino.textContent = 'Dia de Destino (Remoto da Pessoa B):';

        DIAS_UTEIS_NOVEMBRO.forEach(dia => {
            const membro = getMembroPorDia(dia);
            
            if (membro) { 
                const nomeMembro = getNomeCompleto(membro);
                const optionText = `${dia} (${nomeMembro})`;

                selectOrigem.innerHTML += `<option value="${dia}">${optionText}</option>`;
                selectDestino.innerHTML += `<option value="${dia}">${optionText}</option>`;
            }
        });
    }
}

function mudarModoTroca(novoModo) {
    modoTroca = novoModo;
    document.getElementById('modoTrocaDia').classList.remove('active');
    document.getElementById('modoTrocaPessoa').classList.remove('active');
    
    if (novoModo === 'dia') {
        document.getElementById('modoTrocaDia').classList.add('active');
    } else {
        document.getElementById('modoTrocaPessoa').classList.add('active');
    }
    
    preencherDropdowns();
}

function efetuarTroca() {
    const diaOrigem = document.getElementById('diaOrigem').value;
    const diaDestino = document.getElementById('diaDestino').value;
    const feedback = document.getElementById('feedbackTroca');

    feedback.textContent = ''; 
    feedback.style.color = 'red';

    if (!diaOrigem || !diaDestino) {
        feedback.textContent = 'Erro: Por favor, selecione os dias de Origem e Destino.';
        return;
    }
    
    const membroRemotoOrigem = estadoRemoto[diaOrigem];
    const membroRemotoDestino = estadoRemoto[diaDestino]; 

    if (modoTroca === 'dia') {
        
        delete estadoRemoto[diaOrigem];
        estadoRemoto[diaDestino] = membroRemotoOrigem;

        if (!validarRegrasSemanais(diaDestino) || !validarRegrasSemanais(diaOrigem)) {
            // Reversão
            delete estadoRemoto[diaDestino];
            estadoRemoto[diaOrigem] = membroRemotoOrigem;
            
            feedback.textContent = `Erro! A troca não é permitida. ${getNomeCompleto(membroRemotoOrigem)} ficaria com 2 dias remotos na mesma semana.`;
            
        } else {
            salvarEstado(); // SALVA O NOVO ESTADO
            atualizarVisual();
            preencherDropdowns();
            feedback.textContent = `Sucesso! ${getNomeCompleto(membroRemotoOrigem)} trocou o dia ${diaOrigem} por ${diaDestino}.`;
            feedback.style.color = 'green';
        }

    } else { 
        
        if (diaOrigem === diaDestino || membroRemotoOrigem === membroRemotoDestino) {
            feedback.textContent = 'Erro: Os dias ou pessoas selecionadas são idênticos.';
            return;
        }

        estadoRemoto[diaOrigem] = membroRemotoDestino; 
        estadoRemoto[diaDestino] = membroRemotoOrigem; 
        
        if (!validarRegrasSemanais(diaDestino) || !validarRegrasSemanais(diaOrigem)) {
            // Reversão da troca
            estadoRemoto[diaOrigem] = membroRemotoOrigem;
            estadoRemoto[diaDestino] = membroRemotoDestino;
            
            feedback.textContent = `Erro! A troca entre ${getNomeCompleto(membroRemotoOrigem)} e ${getNomeCompleto(membroRemotoDestino)} é inválida (quebra a regra de 1 dia/semana).`;
            
        } else {
            salvarEstado(); // SALVA O NOVO ESTADO
            atualizarVisual();
            preencherDropdowns();
            feedback.textContent = `Sucesso! Troca concluída: ${getNomeCompleto(membroRemotoOrigem)} trocou remoto com ${getNomeCompleto(membroRemotoDestino)}.`;
            feedback.style.color = 'green';
        }
    }
}


// ==========================================================
// CONFIGURAÇÃO
// ==========================================================

function adicionarEventListeners() {
    document.getElementById('btnTrocar').addEventListener('click', efetuarTroca);
    document.getElementById('modoTrocaDia').addEventListener('click', () => mudarModoTroca('dia'));
    document.getElementById('modoTrocaPessoa').addEventListener('click', () => mudarModoTroca('pessoa'));
    
    document.getElementById('btnAplicarFerias').addEventListener('click', aplicarFerias);
    document.getElementById('btnLimparFerias').addEventListener('click', limparFerias);
    
    // NOVO: Listener para o Reset
    document.getElementById('btnReset').addEventListener('click', resetarEstado);
}


// ==========================================================
// INÍCIO DA EXECUÇÃO (Agora com Carregamento de Estado)
// ==========================================================

// 1. Carrega o estado guardado (se houver)
carregarEstado();

// 2. Preenche os dropdowns de Férias/Datas (independente do estado)
preencherSelectSubstitutos(); 
preencherDropdownsDatas();

// 3. Adiciona todos os eventos
adicionarEventListeners(); 

// 4. Inicializa o calendário. Se o estado remoto estiver vazio, ele calcula a rotação padrão.

inicializarCalendario();
