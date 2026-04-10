// 1. IMPORTAÇÕES DO FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, doc, setDoc, onSnapshot, addDoc, 
    serverTimestamp, query, orderBy, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. CONFIGURAÇÃO DO FIREBASE (Cole a sua chave aqui)
const firebaseConfig = {
    apiKey: "AIzaSyD78g8BkCFCMwFxYkYmh6V0zfXmLvHQkEY",
    authDomain: "dss-digital-senai.firebaseapp.com",
    projectId: "dss-digital-senai",
    storageBucket: "dss-digital-senai.firebasestorage.app",
    messagingSenderId: "684295617529",
    appId: "1:684295617529:web:8893f33934bedbfd51db28",
    measurementId: "G-SX21L62QMG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. BASE DE DADOS LOCAL (18 Nomes)
const bancoDeDados = {
    "0001143260": { nome: "GERALDO PEREIRA XAVIER", assinatura: "assina" },
    "0001194553": { nome: "ANA BEATRIZ ROCHA BARBOSA", assinatura: "assina" },
    "0001194470": { nome: "ANTONIO SERGIO MIGUEL CUNHA", assinatura: "assina"},
    "0001194638": { nome: "ARIEL DUARTE CAJADO", assinatura: "assina"},
    "0001194585": { nome: "DIEGO PEREIRA SALES", assinatura: "assina"},
    "0001071300": { nome: "DJONATHA MESSIAS RIBEIRO SANTOS", assinatura: "assina"},
    "0001194231": { nome: "FELIPE ALEXANDRE DA ROCHA SILVA", assinatura: "assina"},
    "0001194285": { nome: "ERICK HENRIQUE BARBOSA", assinatura: "assina"},
    "0001194278": { nome: "JOAO VICTOR SARAIVA RESENDE", assinatura: "assina"},
    "0001103840": { nome: "JOHNY ROBERTO OLIVEIRA JUNIOR", assinatura: "assina"},
    "0001194502": { nome: "KAUANNY CRISTINY SANTOS FERREIRA", assinatura: "assina"},
    "0001145074": { nome: "LUIS GUSTAVO DE SOUZA MELO", assinatura: "assina"},
    "0001194133": { nome: "MARIA GABRIELA DOS SANTOS", assinatura: "assina"},
    "0001135194": { nome: "MARIANA ZUCCO GONTIJO", assinatura: "assina"},
    "0001104669": { nome: "NICOLAS KEVIN FERREIRA DA SILVA", assinatura: "assina"},
    "0001194531": { nome: "NICOLLE HERMANO GONCALVES DA SILVA", assinatura: "assina"},
    "0000921621": { nome: "PABLO YURI PIRES DE SOUZA", assinatura: "assina"},
    "0001023129": { nome: "RONAN JOSE FERREIRA COSTA", assinatura: "assina"}
};

// 4. MAPEAMENTO DA TELA
const telaLogin = document.getElementById('tela-login');
const telaDSS = document.getElementById('tela-dss');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('msg-erro');
const btnSair = document.getElementById('btn-sair');
const usuarioLogadoTexto = document.getElementById('usuario-logado');

// Elementos novos do Tema e PDF
const dataAtualText = document.getElementById('data-atual');
const temaDisplay = document.getElementById('tema-display');
const inputTema = document.getElementById('input-tema');
const btnSalvarTema = document.getElementById('btn-salvar-tema');
const btnGerarPdf = document.getElementById('btn-gerar-pdf');

const btnEntrarAluno = document.getElementById('btn-entrar-aluno');
const painelProfessor = document.getElementById('painel-professor');
const btnFinalizar = document.getElementById('btn-finalizar');

const btnTrava = document.getElementById('btn-trava');
const btnPular = document.getElementById('btn-pular'); 
const badgeStatus = document.getElementById('badge-status');
const nomeResponsavelText = document.getElementById('nome-responsavel'); 

const matriculaInput = document.getElementById('matricula');
const nomeInput = document.getElementById('nome');
const btnAssinar = document.getElementById('btn-assinar');
const tabelaBody = document.querySelector('#tabela-presenca tbody');

// Variáveis de Controle
let colaboradorAtual = null;
let listaLiberada = false; 
let presentes = new Set(); 
let filaResponsaveis = []; 
let pulosAtuais = 0; 

// 5. INICIALIZAÇÃO DA DATA
const dataHoje = new Date().toLocaleDateString('pt-BR');
dataAtualText.innerText = dataHoje;

// 6. LÓGICA DE LOGIN
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const senha = document.getElementById('senha-login').value;

    if (senha === "senai123") {
        telaLogin.style.display = 'none';
        telaDSS.style.display = 'block';
        painelProfessor.style.display = 'flex'; 
        btnFinalizar.style.display = 'inline-block'; 
        btnGerarPdf.style.display = 'inline-block'; // Mostra botão do PDF
        
        usuarioLogadoTexto.innerText = "Professor"; 
        msgErro.style.display = 'none';
        document.getElementById('senha-login').value = ''; 
    } else {
        msgErro.style.display = 'block';
    }
});

btnEntrarAluno.addEventListener('click', () => {
    telaLogin.style.display = 'none';
    telaDSS.style.display = 'block';
    painelProfessor.style.display = 'none'; 
    btnFinalizar.style.display = 'none'; 
    btnGerarPdf.style.display = 'none'; // Esconde botão do PDF do aluno
    usuarioLogadoTexto.innerText = "Acesso de Colaborador/Aluno";
});

btnSair.addEventListener('click', () => {
    telaDSS.style.display = 'none';
    telaLogin.style.display = 'block';
    limparFormulario();
});

// 7. FIREBASE EM TEMPO REAL

// A - Escuta o Status (Trava e Tema)
onSnapshot(doc(db, "configuracoes", "statusDSS"), (documento) => {
    if (documento.exists()) {
        listaLiberada = documento.data().aberta;
        temaDisplay.innerText = documento.data().tema || "Aguardando definição...";
    } else {
        listaLiberada = false; 
    }

    if (listaLiberada) {
        badgeStatus.innerHTML = "Aberta para Assinaturas";
        badgeStatus.className = "status-liberado";
        btnTrava.innerText = "Bloquear Lista";
        btnTrava.classList.add('modo-bloquear');
        matriculaInput.disabled = false;
        matriculaInput.placeholder = "Ex: 1001";
    } else {
        badgeStatus.innerHTML = "Bloqueada";
        badgeStatus.className = "status-bloqueado";
        btnTrava.innerText = "Liberar Lista";
        btnTrava.classList.remove('modo-bloquear');
        matriculaInput.disabled = true;
        matriculaInput.placeholder = "Aguardando liberação do professor...";
        limparFormulario();
    }
});

// Ação de Salvar Tema
btnSalvarTema.addEventListener('click', async () => {
    const temaTexto = inputTema.value.trim();
    if (!temaTexto) { alert("Digite um tema antes de salvar."); return; }
    
    // O merge:true altera o tema sem apagar a situação da trava
    await setDoc(doc(db, "configuracoes", "statusDSS"), { tema: temaTexto }, { merge: true });
    alert("Tema definido para todos!");
    inputTema.value = "";
});

btnTrava.addEventListener('click', async () => {
    await setDoc(doc(db, "configuracoes", "statusDSS"), { aberta: !listaLiberada }, { merge: true });
});

// B - Escuta a Fila do DSS
onSnapshot(doc(db, "configuracoes", "filaDSS"), (documento) => {
    if (documento.exists()) {
        filaResponsaveis = documento.data().fila || [];
        pulosAtuais = documento.data().pulos || 0;
        
        if(filaResponsaveis.length > 0) {
            let visualFila = [...filaResponsaveis];
            if (pulosAtuais > 0 && pulosAtuais < visualFila.length) {
                let apresentador = visualFila.splice(pulosAtuais, 1)[0];
                visualFila.unshift(apresentador);
            }
            const matriculaDoDia = visualFila[0];
            const info = bancoDeDados[matriculaDoDia];
            nomeResponsavelText.innerText = info ? info.nome : "Desconhecido";
        } else {
            nomeResponsavelText.innerText = "Nenhum responsável na fila";
        }
    } else {
        // Primeira vez rodando: organiza do A ao Z
        const filaInicial = Object.keys(bancoDeDados).sort((a, b) => {
            return bancoDeDados[a].nome.localeCompare(bancoDeDados[b].nome);
        }); 
        setDoc(doc(db, "configuracoes", "filaDSS"), { fila: filaInicial, pulos: 0 });
    }
});

// Ação de Pular
btnPular.addEventListener('click', async () => {
    if (filaResponsaveis.length === 0) return;
    let novoPulo = pulosAtuais + 1;
    if (novoPulo >= filaResponsaveis.length) novoPulo = 0;
    await setDoc(doc(db, "configuracoes", "filaDSS"), { fila: filaResponsaveis, pulos: novoPulo });
});

// Escuta Assinaturas
const consultaPresencas = query(collection(db, "presencas"), orderBy("nome", "asc"));
onSnapshot(consultaPresencas, (snapshot) => {
    tabelaBody.innerHTML = ''; 
    presentes.clear(); 
    snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        presentes.add(dados.matricula); 
        adicionarNaTabela(dados); 
    });
});

// 8. LÓGICA DE ASSINATURA NA TELA
matriculaInput.addEventListener('input', (e) => {
    const mat = e.target.value.trim(); 
    if (bancoDeDados[mat]) {
        colaboradorAtual = bancoDeDados[mat];
        colaboradorAtual.matricula = mat;
        nomeInput.value = colaboradorAtual.nome; 
        btnAssinar.disabled = false;             
    } else {
        colaboradorAtual = null;
        nomeInput.value = "";
        btnAssinar.disabled = true;
    }
});

matriculaInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !btnAssinar.disabled) { registrarPresenca(); }
});

btnAssinar.addEventListener('click', registrarPresenca);

async function registrarPresenca() {
    if (!colaboradorAtual) return;
    if (!listaLiberada) { alert("A lista está fechada!"); return; }
    if (presentes.has(colaboradorAtual.matricula)) {
        alert(`${colaboradorAtual.nome} já assinou hoje!`);
        limparFormulario(); return;
    }
    await addDoc(collection(db, "presencas"), {
        matricula: colaboradorAtual.matricula,
        nome: colaboradorAtual.nome,
        assinatura: colaboradorAtual.assinatura,
        timestamp: serverTimestamp() 
    });
    limparFormulario();
}

function adicionarNaTabela(colaborador) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${colaborador.matricula}</strong></td>
        <td>${colaborador.nome}</td>
        <td><img src="${colaborador.assinatura}" alt="Assinatura"></td>
        <td><span class="badge">Presente</span></td>
    `;
    tabelaBody.appendChild(tr); 
}

function limparFormulario() {
    matriculaInput.value = ""; nomeInput.value = ""; btnAssinar.disabled = true; colaboradorAtual = null;
    if (!matriculaInput.disabled) matriculaInput.focus(); 
}

// 9. LÓGICA DE GERAÇÃO DO PDF (Corrigida para não sair em branco)
btnGerarPdf.addEventListener('click', () => {
    // 1. Prepara o horário
    const horarioAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // 2. Preenche o cabeçalho do template escondido
    document.getElementById('pdf-data').innerText = dataHoje;
    document.getElementById('pdf-horario').innerText = horarioAtual;
    document.getElementById('pdf-tema').innerText = temaDisplay.innerText;
    document.getElementById('pdf-instrutor').innerText = nomeResponsavelText.innerText;

    // 3. Preenche as 30 linhas da tabela do PDF
    const tbodyPDF = document.getElementById('pdf-tbody');
    tbodyPDF.innerHTML = ''; 
    const trsPresentes = document.querySelectorAll('#tabela-presenca tbody tr');

    for (let i = 0; i < 30; i++) {
        const tr = document.createElement('tr');
        
        if (i < trsPresentes.length) {
            // [0]=Matrícula, [1]=Nome, [2]=Assinatura (Da tela para o PDF)
            const matricula = trsPresentes[i].querySelectorAll('td')[0].innerText;
            const nomePessoa = trsPresentes[i].querySelectorAll('td')[1].innerText;
            const assinaturaImg = trsPresentes[i].querySelectorAll('td')[2].innerHTML;
            
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${matricula}</td>
                <td>${nomePessoa}</td>
                <td style="text-align: center; padding: 2px;">
                    ${assinaturaImg.replace('<img', '<img style="max-height: 22px;"')}
                </td>
            `;
        } else {
            // Cria linhas em branco para inteirar 30 espaços
            tr.innerHTML = `<td>${i + 1}</td><td></td><td></td><td></td>`;
        }
        tbodyPDF.appendChild(tr);
    }

    // --- A MÁGICA PARA NÃO FICAR BRANCO ---
    const elementoPDF = document.getElementById('container-pdf');
    const telaPrincipal = document.getElementById('tela-dss');

    const opt = {
        margin:       0,
        filename:     `DDS_${dataHoje.replace(/\//g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const textoOriginal = btnGerarPdf.innerText;
    btnGerarPdf.innerText = "⏳ Gerando...";
    btnGerarPdf.disabled = true;

    // 1. Traz o template do PDF para a tela visível e esconde o sistema
    elementoPDF.style.position = 'relative';
    elementoPDF.style.left = '0';
    telaPrincipal.style.display = 'none';

    // 2. Tira a foto e gera o PDF
    html2pdf().set(opt).from(elementoPDF).save().then(() => {
        
        // 3. Devolve tudo ao normal (esconde o PDF e mostra o sistema)
        elementoPDF.style.position = 'absolute';
        elementoPDF.style.left = '-9999px';
        telaPrincipal.style.display = 'block';

        btnGerarPdf.innerText = textoOriginal;
        btnGerarPdf.disabled = false;
    });
});
// 10. FINALIZAR O DIA
btnFinalizar.addEventListener('click', async () => {
    if (presentes.size === 0) { alert("A lista está vazia."); return; }

    if (filaResponsaveis.length > 0) {
        let visualFila = [...filaResponsaveis];
        if (pulosAtuais > 0 && pulosAtuais < visualFila.length) {
            let apresentador = visualFila.splice(pulosAtuais, 1)[0];
            visualFila.unshift(apresentador);
        }
        let quemApresentouHoje = visualFila.shift(); 
        visualFila.push(quemApresentouHoje); 
        await setDoc(doc(db, "configuracoes", "filaDSS"), { fila: visualFila, pulos: 0 });
    }

    // Bloqueia e limpa o tema para amanhã
    await setDoc(doc(db, "configuracoes", "statusDSS"), { aberta: false, tema: "Aguardando definição..." });
    
    // Limpa assinaturas do banco
    const snapshotPresencas = await getDocs(collection(db, "presencas"));
    const promessasDeletar = snapshotPresencas.docs.map((d) => deleteDoc(doc(db, "presencas", d.id)));
    await Promise.all(promessasDeletar);
    
    limparFormulario();
    alert(`DSS Finalizado com sucesso!\nO próximo apresentador já foi escalado para amanhã.`);
});
