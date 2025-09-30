// =================================================================================
// ParkEasy TCC - Script Definitivo v19
// Arquitetura à Prova de Falhas (Login-Primeiro)
// =================================================================================

// Importa as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithRedirect, 
    signOut, 
    onAuthStateChanged, 
    getRedirectResult,
    browserSessionPersistence,
    setPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Configuração do Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyANqo2XC6y2FA_sJ6zMjOz65MeGaYp-axM",
    authDomain: "parkeasy-dd00e.firebaseapp.com",
    databaseURL: "https://parkeasy-dd00e-default-rtdb.firebaseio.com",
    projectId: "parkeasy-dd00e",
    storageBucket: "parkeasy-dd00e.appspot.com",
    messagingSenderId: "811104871555",
    appId: "1:811104871555:web:f629f849914d908cb6a7b6"
};

// --- Inicialização dos Serviços ---
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- Variáveis Globais ---
let currentUser = null;
let unsubscribeFromVagas = null; // Função para parar de "ouvir" o banco de dados

// --- Seleção dos Elementos da UI ---
const elements = {
    btnLogin: document.getElementById('btn-login'),
    btnLogout: document.getElementById('btn-logout'),
    userInfoDiv: document.getElementById('user-info'),
    userNameSpan: document.getElementById('user-name'),
    contadorVagas: document.getElementById('vagas-livres'),
    header: document.querySelector('.site-header'),
    vagasElements: Array.from(document.querySelectorAll('.vaga'))
};

// --- Funções de Ação ---
function handleLogin() {
    setPersistence(auth, browserSessionPersistence)
        .then(() => signInWithRedirect(auth, provider))
        .catch(error => console.error("Erro ao iniciar login:", error));
}

function handleLogout() {
    signOut(auth);
}

function handleReservar(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, { status: "reservada", tempoExpiracao: Date.now() + 180000, reservadoPor: currentUser.uid });
}

function handleCancelar(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, { status: false, tempoExpiracao: null, reservadoPor: null });
}

function handleCheckin(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, { status: "estacionando", tempoExpiracao: Date.now() + 60000, reservadoPor: currentUser.uid });
}

// --- Função Principal de Renderização ---
function renderUI(vagasData = null) {
    // 1. Renderiza o estado de Autenticação
    if (currentUser) {
        elements.userNameSpan.textContent = currentUser.displayName.split(' ')[0];
        elements.userInfoDiv.style.display = 'flex';
        elements.btnLogin.style.display = 'none';
        elements.header.classList.add('logged-in');
    } else {
        elements.userInfoDiv.style.display = 'none';
        elements.btnLogin.style.display = 'block';
        elements.header.classList.remove('logged-in');
        elements.contadorVagas.textContent = "Faça login para ver e interagir com as vagas.";
    }

    // Se estiver deslogado, reseta a aparência das vagas e para por aqui.
    if (!currentUser) {
        elements.vagasElements.forEach(vagaEl => {
            vagaEl.className = 'vaga';
            vagaEl.querySelector('.status').textContent = '--';
            vagaEl.querySelector('.btn-reservar').style.display = 'none';
            vagaEl.querySelector('.btn-checkin').style.display = 'none';
            vagaEl.querySelector('.btn-cancelar').style.display = 'none';
        });
        return;
    }

    // Se estiver logado, mas os dados ainda não chegaram.
    if (!vagasData) {
        elements.contadorVagas.textContent = "Carregando vagas...";
        return;
    }
    
    // 2. Renderiza o estado das Vagas
    let vagasLivres = 0;
    for (let i = 0; i < 4; i++) {
        const vagaElement = elements.vagasElements[i];
        const vagaData = vagasData[`vaga${i + 1}`] || { status: false };
        const isOwner = currentUser && currentUser.uid === vagaData.reservadoPor;

        const statusElement = vagaElement.querySelector('.status');
        const btnReservar = vagaElement.querySelector('.btn-reservar');
        const btnCheckin = vagaElement.querySelector('.btn-checkin');
        const btnCancelar = vagaElement.querySelector('.btn-cancelar');

        // Reset
        btnReservar.style.display = 'none';
        btnCheckin.style.display = 'none';
        btnCancelar.style.display = 'none';
        vagaElement.className = 'vaga';

        if (vagaData.status === true) {
            vagaElement.classList.add('ocupada');
            statusElement.textContent = 'OCUPADA';
        } else if (vagaData.status === "reservada" || vagaData.status === "estacionando") {
            const isEstacionando = vagaData.status === "estacionando";
            vagaElement.classList.add(isEstacionando ? 'estacionando' : 'reservada');
            statusElement.textContent = isEstacionando ? 'ESTACIONANDO' : 'RESERVADA';
            if (isOwner) {
                if (!isEstacionando) btnCheckin.style.display = 'block';
                btnCancelar.style.display = 'block';
            }
        } else { // Livre
            vagaElement.classList.add('livre');
            statusElement.textContent = 'LIVRE';
            btnReservar.style.display = 'block';
            vagasLivres++;
        }
    }
    elements.contadorVagas.textContent = `${vagasLivres} VAGAS DISPONÍVEIS`;
}

// --- Ponto de Entrada da Aplicação ---
function main() {
    // 1. Anexa os eventos de clique
    elements.btnLogin.addEventListener('click', handleLogin);
    elements.btnLogout.addEventListener('click', handleLogout);
    for (let i = 0; i < 4; i++) {
        const numVaga = i + 1;
        elements.vagasElements[i].querySelector('.btn-reservar').addEventListener('click', () => handleReservar(numVaga));
        elements.vagasElements[i].querySelector('.btn-checkin').addEventListener('click', () => handleCheckin(numVaga));
        elements.vagasElements[i].querySelector('.btn-cancelar').addEventListener('click', () => handleCancelar(numVaga));
    }

    // 2. O OBSERVADOR DE AUTH É O PONTO CENTRAL DE TUDO
    onAuthStateChanged(auth, (user) => {
        currentUser = user;

        // Se havia um "ouvinte" do banco de dados antigo, ele é desligado.
        if (unsubscribeFromVagas) {
            unsubscribeFromVagas();
        }

        if (user) {
            // Se o usuário LOGOU:
            // SÓ AGORA nós começamos a ouvir o banco de dados.
            const vagasRef = ref(database, 'vagas/');
            unsubscribeFromVagas = onValue(vagasRef, 
                (snapshot) => {
                    renderUI(snapshot.val()); // Renderiza com os dados recebidos
                }, 
                (error) => {
                    console.error("Erro de permissão do Firebase:", error);
                    renderUI(null); // Renderiza o estado de erro/deslogado
                }
            );
        } else {
            // Se o usuário DESLOGOU:
            // Renderiza a tela no estado "deslogado".
            renderUI(null);
        }
    });

    // 3. Verifica o resultado do redirect por último.
    // O onAuthStateChanged acima será ativado automaticamente se o login for bem-sucedido.
    getRedirectResult(auth).catch(error => console.error("Erro no getRedirectResult:", error));
}

// Inicia a aplicação
main();

