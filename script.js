// 1. IMPORTAÇÕES DO FIREBASE (Nuvem)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. CONFIGURAÇÃO DO SEU BANCO DE DADOS
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

// 3. BASE DE DADOS LOCAL (Simulação de Alunos)
const bancoDeDados = {
    "1001": { nome: "Carlos Almeida", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Carlos" },
    "1002": { nome: "Ana Paula Silva", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Ana" },
    "1003": { nome: "Marcos Vinícius", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Marcos" }
};

// 4. MAPEAMENTO DOS ELEMENTOS DA TELA
const telaLogin = document.getElementById('tela-login');
const telaDSS = document.getElementById('tela-dss');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('msg-erro');
const btnSair = document.getElementById('btn-sair');
const usuarioLogadoTexto = document.getElementById('usuario-logado');

const btnEntrarAluno = document.getElementById('btn-entrar-aluno');
const painelProfessor = document.getElementById('painel-professor');
const btnFinalizar = document.getElementById('btn-finalizar');

const btnTrava = document.getElementById('btn-trava');
const badgeStatus = document.getElementById('badge-status');
const matriculaInput = document.getElementById('matricula');
const nomeInput = document.getElementById('nome');
const btnAssinar = document.getElementById('btn-assinar');
const tabelaBody = document.querySelector('#tabela-presenca tbody');

// Variáveis de Estado
let colaboradorAtual = null;
let listaLiberada = false; 
let presentes = new Set(); 

// 5. LÓGICA DE PERFIS E LOGIN

// Acesso Professor
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email-login').value.toLowerCase();
    const senha = document.getElementById('senha-login').value;

    if (email.includes('senai') && senha.length > 3) {
        telaLogin.style.display = 'none';
        telaDSS.style.display = 'block';
        painelProfessor.style.display = 'flex'; // Mostra controles do professor
        btnFinalizar.style.display = 'inline-block'; // Mostra botão de finalizar
        
        usuarioLogadoTexto.innerText = email;
        msgErro.style.display = 'none';
        document.getElementById('senha-login').value = ''; 
    } else {
        msgErro.style.display = 'block';
    }
});

// Acesso Aluno
btnEntrarAluno.addEventListener('click', () => {
    telaLogin.style.display = 'none';
    telaDSS.style.display = 'block';
    painelProfessor.style.display = 'none'; // Esconde controles
    btnFinalizar.style.display = 'none'; // Esconde botão de finalizar
    
    usuarioLogadoTexto.innerText = "Acesso de Colaborador/Aluno";
});

// Botão Voltar ao Início
btnSair.addEventListener('click', () => {
    telaDSS.style.display = 'none';
    telaLogin.style.display = 'block';
    document.getElementById('email-login').value = '';
    limparFormulario();
});

// 6. COMUNICAÇÃO FIREBASE (TEMPO REAL)

// Escuta mudanças de Trava/Destrava
onSnapshot(doc(db, "configuracoes", "statusDSS"), (documento) => {
    if (documento.exists()) {
        listaLiberada = documento.data().aberta;
    } else {
        listaLiberada = false; 
    }

    // Atualiza a interface para TODOS (Professor e Alunos)
    if (listaLiberada) {
        badgeStatus.innerHTML = "🔓 Aberta para Assinaturas";
        badgeStatus.className = "status-liberado";
        
        btnTrava.innerText = "🔒 Bloquear Lista";
        btnTrava.classList.add('modo-bloquear');
        
        matriculaInput.disabled = false;
        matriculaInput.placeholder = "Ex: 1001";
    } else {
        badgeStatus.innerHTML = "🔒 Bloqueada";
        badgeStatus.className = "status-bloqueado";
        
        btnTrava.innerText = "🔓 Liberar Lista";
        btnTrava.classList.remove('modo-bloquear');
        
        matriculaInput.disabled = true;
        matriculaInput.placeholder = "Aguardando liberação do professor...";
        limparFormulario();
    }
});

// Professor clica em Travar/Destravar
btnTrava.addEventListener('click', async () => {
    await setDoc(doc(db, "configuracoes", "statusDSS"), {
        aberta: !listaLiberada
    });
});

// Escuta a Tabela de Assinaturas
const consultaPresencas = query(collection(db, "presencas"), orderBy("timestamp", "desc"));
onSnapshot(consultaPresencas, (snapshot) => {
    tabelaBody.innerHTML = ''; 
    presentes.clear(); 

    snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        presentes.add(dados.matricula); 
        adicionarNaTabela(dados); 
    });
});

// 7. LÓGICA DE PREENCHIMENTO E ASSINATURA

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
    if (e.key === 'Enter' && !btnAssinar.disabled) {
        registrarPresenca();
    }
});

btnAssinar.addEventListener('click', registrarPresenca);

async function registrarPresenca() {
    if (!colaboradorAtual) return;
    if (!listaLiberada) {
        alert("A lista está fechada! Aguarde a liberação.");
        return;
    }

    if (presentes.has(colaboradorAtual.matricula)) {
        alert(`O colaborador ${colaboradorAtual.nome} já assinou hoje!`);
        limparFormulario();
        return;
    }

    // Salva no banco de dados na nuvem
    await addDoc(collection(db, "presencas"), {
        matricula: colaboradorAtual.matricula,
        nome: colaboradorAtual.nome,
        assinatura: colaboradorAtual.assinatura,
        timestamp: serverTimestamp() 
    });

    limparFormulario();
}

// 8. FUNÇÕES DE APOIO DA INTERFACE

function adicionarNaTabela(colaborador) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${colaborador.matricula}</strong></td>
        <td>${colaborador.nome}</td>
        <td><img src="${colaborador.assinatura}" alt="Assinatura"></td>
        <td><span class="badge">✅ Presente</span></td>
    `;
    tabelaBody.appendChild(tr); 
}

function limparFormulario() {
    matriculaInput.value = "";
    nomeInput.value = "";
    btnAssinar.disabled = true;
    colaboradorAtual = null;
    if (!matriculaInput.disabled) {
        matriculaInput.focus(); 
    }
}

btnFinalizar.addEventListener('click', () => {
    if (presentes.size === 0) {
        alert("A lista está vazia. Ninguém assinou ainda.");
        return;
    }
    alert(`DSS Finalizado com sucesso!\nTotal de presenças registradas no banco de dados: ${presentes.size}`);
});