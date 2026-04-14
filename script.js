// 1. IMPORTAÇÕES DO FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, doc, setDoc, onSnapshot, addDoc, 
    serverTimestamp, query, orderBy, getDocs, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. CONFIGURAÇÃO DO FIREBASE
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

// 3. BASE DE DADOS LOCAL (18 Nomes - Sem assinatura fixa)
const bancoDeDados = {
    "0001143260": { nome: "GERALDO PEREIRA XAVIER" },
    "0001194553": { nome: "ANA BEATRIZ ROCHA BARBOSA" },
    "0001194470": { nome: "ANTONIO SERGIO MIGUEL CUNHA" },
    "0001194638": { nome: "ARIEL DUARTE CAJADO" },
    "0001194585": { nome: "DIEGO PEREIRA SALES" },
    "0001071300": { nome: "DJONATHA MESSIAS RIBEIRO SANTOS" },
    "0001194231": { nome: "FELIPE ALEXANDRE DA ROCHA SILVA" },
    "0001194285": { nome: "ERICK HENRIQUE BARBOSA" },
    "0001194278": { nome: "JOAO VICTOR SARAIVA RESENDE" },
    "0001103840": { nome: "JOHNY ROBERTO OLIVEIRA JUNIOR" },
    "0001194502": { nome: "KAUANNY CRISTINY SANTOS FERREIRA" },
    "0001145074": { nome: "LUIS GUSTAVO DE SOUZA MELO" },
    "0001194133": { nome: "MARIA GABRIELA DOS SANTOS" },
    "0001135194": { nome: "MARIANA ZUCCO GONTIJO" },
    "0001104669": { nome: "NICOLAS KEVIN FERREIRA DA SILVA" },
    "0001194531": { nome: "NICOLLE HERMANO GONCALVES DA SILVA" },
    "0000921621": { nome: "PABLO YURI PIRES DE SOUZA" },
    "0001023129": { nome: "RONAN JOSE FERREIRA COSTA" }
};

// 4. MAPEAMENTO DA TELA
const telaLogin = document.getElementById('tela-login');
const telaDSS = document.getElementById('tela-dss');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('msg-erro');
const btnSair = document.getElementById('btn-sair');
const usuarioLogadoTexto = document.getElementById('usuario-logado');

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

// MODAL E CANVAS
const modalAssinatura = document.getElementById('modal-assinatura');
const canvas = document.getElementById('canvas-assinatura');
const ctx = canvas.getContext('2d');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnLimparModal = document.getElementById('btn-limpar-modal');
const btnSalvarModal = document.getElementById('btn-salvar-modal');

// Variáveis de Controle
let colaboradorAtual = null;
let listaLiberada = false; 
let presentes = new Set(); 
let filaResponsaveis = []; 
let pulosAtuais = 0; 
let desenhando = false;

// 5. INICIALIZAÇÃO DA DATA
const dataHoje = new Date().toLocaleDateString('pt-BR');
dataAtualText.innerText = dataHoje;

// 6. LÓGICA DE LOGIN (Agora segura!)
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const senhaDigitada = document.getElementById('senha-login').value;
    const btnEntrar = document.getElementById('btn-entrar');
    const textoOriginal = btnEntrar.innerText;

    btnEntrar.innerText = "Verificando...";
    btnEntrar.disabled = true;

    try {
        const docSnap = await getDoc(doc(db, "configuracoes", "acesso"));
        
        if (docSnap.exists() && senhaDigitada === docSnap.data().senha) {
            telaLogin.style.display = 'none';
            telaDSS.style.display = 'block';
            painelProfessor.style.display = 'flex'; 
            btnFinalizar.style.display = 'inline-block'; 
            btnGerarPdf.style.display = 'inline-block'; 
            
            usuarioLogadoTexto.innerText = "Professor"; 
            msgErro.style.display = 'none';
            document.getElementById('senha-login').value = ''; 
        } else {
            msgErro.style.display = 'block';
        }
    } catch (error) {
        console.error("Erro ao verificar senha:", error);
        alert("Erro de conexão com o servidor. Verifique sua internet.");
    } finally {
        btnEntrar.innerText = textoOriginal;
        btnEntrar.disabled = false;
    }
});

btnEntrarAluno.addEventListener('click', () => {
    telaLogin.style.display = 'none';
    telaDSS.style.display = 'block';
    painelProfessor.style.display = 'none'; 
    btnFinalizar.style.display = 'none'; 
    btnGerarPdf.style.display = 'none'; 
    usuarioLogadoTexto.innerText = "Acesso de Colaborador/Aluno";
});

btnSair.addEventListener('click', () => {
    telaDSS.style.display = 'none';
    telaLogin.style.display = 'block';
    limparFormulario();
});

// 7. FIREBASE EM TEMPO REAL
onSnapshot(doc(db, "configuracoes", "statusDSS"), (documento) => {
    if (documento.exists()) {
        listaLiberada = documento.data().aberta;
        temaDisplay.innerText = documento.data().tema || "Aguardando definição...";
    } else { listaLiberada = false; }

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
        matriculaInput.placeholder = "Aguardando liberação...";
        limparFormulario();
    }
});

btnSalvarTema.addEventListener('click', async () => {
    const temaTexto = inputTema.value.trim();
    if (!temaTexto) { alert("Digite um tema antes de salvar."); return; }
    await setDoc(doc(db, "configuracoes", "statusDSS"), { tema: temaTexto }, { merge: true });
    alert("Tema definido para todos!"); inputTema.value = "";
});

btnTrava.addEventListener('click', async () => {
    await setDoc(doc(db, "configuracoes", "statusDSS"), { aberta: !listaLiberada }, { merge: true });
});

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
        } else { nomeResponsavelText.innerText = "Nenhum responsável"; }
    } else {
        const filaInicial = Object.keys(bancoDeDados).sort((a, b) => bancoDeDados[a].nome.localeCompare(bancoDeDados[b].nome)); 
        setDoc(doc(db, "configuracoes", "filaDSS"), { fila: filaInicial, pulos: 0 });
    }
});

btnPular.addEventListener('click', async () => {
    if (filaResponsaveis.length === 0) return;
    let novoPulo = pulosAtuais + 1;
    if (novoPulo >= filaResponsaveis.length) novoPulo = 0;
    await setDoc(doc(db, "configuracoes", "filaDSS"), { fila: filaResponsaveis, pulos: novoPulo });
});

onSnapshot(query(collection(db, "presencas"), orderBy("nome", "asc")), (snapshot) => {
    tabelaBody.innerHTML = ''; presentes.clear(); 
    snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        presentes.add(dados.matricula); 
        adicionarNaTabela(dados); 
    });
});

// 8. LÓGICA DE ASSINATURA COM CANVAS
matriculaInput.addEventListener('input', (e) => {
    const mat = e.target.value.trim(); 
    if (bancoDeDados[mat]) {
        colaboradorAtual = bancoDeDados[mat];
        colaboradorAtual.matricula = mat;
        nomeInput.value = colaboradorAtual.nome; 
        btnAssinar.disabled = false;             
    } else {
        colaboradorAtual = null; nomeInput.value = ""; btnAssinar.disabled = true;
    }
});

btnAssinar.addEventListener('click', () => {
    if (!colaboradorAtual) return;
    if (!listaLiberada) { alert("A lista está fechada!"); return; }
    if (presentes.has(colaboradorAtual.matricula)) {
        alert(`${colaboradorAtual.nome} já assinou hoje!`);
        limparFormulario(); return;
    }
    modalAssinatura.style.display = 'flex';
    limparCanvas();
});

ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';

function getPosicao(e) {
    let rect = canvas.getBoundingClientRect();
    let x = (e.clientX || e.touches[0].clientX) - rect.left;
    let y = (e.clientY || e.touches[0].clientY) - rect.top;
    return { x: x, y: y };
}

canvas.addEventListener('mousedown', (e) => { desenhando = true; ctx.beginPath(); ctx.moveTo(getPosicao(e).x, getPosicao(e).y); });
canvas.addEventListener('mousemove', (e) => { if (desenhando) { ctx.lineTo(getPosicao(e).x, getPosicao(e).y); ctx.stroke(); }});
canvas.addEventListener('mouseup', () => desenhando = false);
canvas.addEventListener('mouseout', () => desenhando = false);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); desenhando = true; ctx.beginPath(); ctx.moveTo(getPosicao(e).x, getPosicao(e).y); }, {passive: false});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (desenhando) { ctx.lineTo(getPosicao(e).x, getPosicao(e).y); ctx.stroke(); }}, {passive: false});
canvas.addEventListener('touchend', () => desenhando = false);

function limparCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

btnFecharModal.addEventListener('click', () => modalAssinatura.style.display = 'none');
btnLimparModal.addEventListener('click', limparCanvas);

btnSalvarModal.addEventListener('click', async () => {
    const assinaturaBase64 = canvas.toDataURL('image/png');
    colaboradorAtual.assinatura = assinaturaBase64;
    
    modalAssinatura.style.display = 'none'; 
    
    await addDoc(collection(db, "presencas"), {
        matricula: colaboradorAtual.matricula,
        nome: colaboradorAtual.nome,
        assinatura: colaboradorAtual.assinatura,
        timestamp: serverTimestamp() 
    });
    limparFormulario();
});

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

// 9. LÓGICA DE GERAÇÃO DO PDF 
btnGerarPdf.addEventListener('click', () => {
    document.getElementById('pdf-curso').innerText = ""; 
    document.getElementById('pdf-data').innerText = dataHoje;
    document.getElementById('pdf-instrutor').innerText = ""; 
    document.getElementById('pdf-codigo').innerText = ""; 
    document.getElementById('pdf-tema').innerText = temaDisplay.innerText;
    document.getElementById('rodape-instrutor').innerText = "Assinatura do Professor"; 
    document.getElementById('rodape-palestrante').innerText = nomeResponsavelText.innerText; 

    const tbodyPDF = document.getElementById('pdf-tbody');
    tbodyPDF.innerHTML = ''; 
    const trsPresentes = document.querySelectorAll('#tabela-presenca tbody tr');

    for (let i = 0; i < 40; i++) {
        const tr = document.createElement('tr');
        const numeroLinha = (i + 1).toString().padStart(2, '0');
        
        if (i < trsPresentes.length) {
            const matricula = trsPresentes[i].querySelectorAll('td')[0].innerText;
            const nomePessoa = trsPresentes[i].querySelectorAll('td')[1].innerText;
            const assinaturaImg = trsPresentes[i].querySelectorAll('td')[2].innerHTML;
            
            // Ajustado para max-height 26px e margem negativa para aumentar a assinatura
            tr.innerHTML = `
                <td>${numeroLinha}</td>
                <td>${matricula}</td>
                <td>${nomePessoa}</td>
                <td style="text-align: center; padding: 1px;">
                    ${assinaturaImg.replace('<img', '<img style="max-height: 26px; margin: -4px 0;"')}
                </td>
            `;
        } else {
            tr.innerHTML = `<td>${numeroLinha}</td><td></td><td></td><td></td>`;
        }
        tbodyPDF.appendChild(tr);
    }

    const elementoPDF = document.getElementById('container-pdf');
    const telaPrincipal = document.getElementById('tela-dss');

    const opt = {
        margin:       0,
        filename:     `DDS_SENAI_${dataHoje.replace(/\//g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const textoOriginal = btnGerarPdf.innerText;
    btnGerarPdf.innerText = "⏳ Gerando...";
    btnGerarPdf.disabled = true;

    elementoPDF.style.position = 'relative';
    elementoPDF.style.left = '0';
    telaPrincipal.style.display = 'none';

    setTimeout(() => {
        html2pdf().set(opt).from(elementoPDF).save().then(() => {
            elementoPDF.style.position = 'absolute';
            elementoPDF.style.left = '-9999px';
            telaPrincipal.style.display = 'block';
            btnGerarPdf.innerText = textoOriginal;
            btnGerarPdf.disabled = false;
        });
    }, 150); 
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

    await setDoc(doc(db, "configuracoes", "statusDSS"), { aberta: false, tema: "Aguardando definição..." });
    
    const snapshotPresencas = await getDocs(collection(db, "presencas"));
    const promessasDeletar = snapshotPresencas.docs.map((d) => deleteDoc(doc(db, "presencas", d.id)));
    await Promise.all(promessasDeletar);
    
    limparFormulario();
    alert(`DSS Finalizado com sucesso!\nO próximo apresentador já foi escalado para amanhã.`);
});

// 11. BLOQUEIO DE INSPECIONAR ELEMENTO (Segurança Front-end)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault(); 
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
       (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
       (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});
