// Importações diretas da Nuvem do Firebase (Sem precisar instalar nada)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Suas chaves do banco de dados Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD78g8BkCFCMwFxYkYmh6V0zfXmLvHQkEY",
    authDomain: "dss-digital-senai.firebaseapp.com",
    projectId: "dss-digital-senai",
    storageBucket: "dss-digital-senai.firebasestorage.app",
    messagingSenderId: "684295617529",
    appId: "1:684295617529:web:8893f33934bedbfd51db28",
    measurementId: "G-SX21L62QMG"
};

// Inicializando a Conexão com o Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Nosso "Banco de Dados" de matriculas (Pode ser transferido pro Firebase no futuro)
const bancoDeDados = {
    "1001": { nome: "Carlos Almeida", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Carlos" },
    "1002": { nome: "Ana Paula Silva", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Ana" },
    "1003": { nome: "Marcos Vinícius", assinatura: "https://via.placeholder.com/150x40/ffffff/000000?text=Assinatura+Marcos" }
};

// --- MAPEMANETO DA TELA ---
const telaLogin = document.getElementById('tela-login');
const telaDSS = document.getElementById('tela-dss');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('msg-erro');
const btnSair = document.getElementById('btn-sair');
const usuarioLogadoTexto = document.getElementById('usuario-logado');

const btnTrava = document.getElementById('btn-trava');
const statusLista = document.getElementById('status-lista');
const matriculaInput = document.getElementById('matricula');
const nomeInput = document.getElementById('nome');
const btnAssinar = document.getElementById('btn-assinar');
const tabelaBody = document.querySelector('#tabela-presenca tbody');

let colaboradorAtual = null;
let listaLiberada = false; 
let presentes = new Set(); // Guarda quem já assinou para não duplicar

// --- LÓGICA DE LOGIN ---
// O professor faz login. Os alunos acessarão a página já na tela do DSS (você pode separar isso em 2 páginas no futuro)
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email-login').value.toLowerCase();
    const senha = document.getElementById('senha-login').value;

    if (email.includes('senai') && senha.length > 3) {
        telaLogin.style.display = 'none';
        telaDSS.style.display = 'block';
        usuarioLogadoTexto.innerText = email;
        msgErro.style.display = 'none';
        document.getElementById('senha-login').value = ''; 
    } else {
        msgErro.style.display = 'block';
    }
});

btnSair.addEventListener('click', () => {
    telaDSS.style.display = 'none';
    telaLogin.style.display = 'block';
    document.getElementById('email-login').value = '';
});

// --- COMUNICAÇÃO EM TEMPO REAL COM O FIREBASE ---

// 1. Escutar a "Trava" do Professor
// Isso atualiza a tela de TODOS os celulares conectados na mesma hora
onSnapshot(doc(db, "configuracoes", "statusDSS"), (documento) => {
    if (documento.exists()) {
        listaLiberada = documento.data().aberta;
    } else {
        listaLiberada = false; // Se o documento não existir, começa bloqueado
    }

    if (listaLiberada) {
        statusLista.innerHTML = "🔓 Liberada";
        statusLista.className = "status-liberado";
        btnTrava.innerText = "🔒 Bloquear Lista";
        btnTrava.classList.add('modo-bloquear');
        matriculaInput.disabled = false; // Alunos podem digitar
    } else {
        statusLista.innerHTML = "🔒 Bloqueada";
        statusLista.className = "status-bloqueado";
        btnTrava.innerText = "🔓 Liberar para Assinaturas";
        btnTrava.classList.remove('modo-bloquear');
        matriculaInput.disabled = true; // Bloqueia o teclado dos alunos
        limparFormulario();
    }
});

// 2. Ação do botão do Professor de Travar/Destravar
btnTrava.addEventListener('click', async () => {
    // Escreve no Firebase o novo status. Todos os celulares vão reagir a isso instantaneamente.
    await setDoc(doc(db, "configuracoes", "statusDSS"), {
        aberta: !listaLiberada
    });
});

// 3. Escutar as Assinaturas (Atualiza a tabela para todo mundo ver quem já assinou)
const consultaPresencas = query(collection(db, "presencas"), orderBy("timestamp", "desc"));
onSnapshot(consultaPresencas, (snapshot) => {
    tabelaBody.innerHTML = ''; // Limpa a tabela antiga
    presentes.clear(); // Limpa a memória local

    snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        presentes.add(dados.matricula); // Registra que a pessoa já está na lista
        adicionarNaTabela(dados); // Desenha a linha na tela
    });
});


// --- LÓGICA DE ASSINATURA DOS ALUNOS ---

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

// Envia a presença para a Nuvem
async function registrarPresenca() {
    if (!colaboradorAtual) return;
    if (!listaLiberada) {
        alert("A lista está fechada! Aguarde a liberação.");
        return;
    }

    if (presentes.has(colaboradorAtual.matricula)) {
        alert(`O colaborador ${colaboradorAtual.nome} já assinou!`);
        limparFormulario();
        return;
    }

    // Salva no Banco de Dados
    await addDoc(collection(db, "presencas"), {
        matricula: colaboradorAtual.matricula,
        nome: colaboradorAtual.nome,
        assinatura: colaboradorAtual.assinatura,
        timestamp: serverTimestamp() // Pega a hora exata do servidor do Google
    });

    limparFormulario();
}

// Funções de Interface
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