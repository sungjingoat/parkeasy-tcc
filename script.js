// Importa as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyANqo2XC6y2FA_sJ6zMjOz65MeGaYp-axM",
    authDomain: "parkeasy-dd00e.firebaseapp.com",
    databaseURL: "https://parkeasy-dd00e-default-rtdb.firebaseio.com",
    projectId: "parkeasy-dd00e",
    storageBucket: "parkeasy-dd00e.appspot.com",
    messagingSenderId: "811104871555",
    appId: "1:811104871555:web:f629f849914d908cb6a7b6"
};

// Inicialização dos serviços
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// --- Elementos da UI ---
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const btnLogout = document.getElementById('btn-logout');
const contadorVagasLivresElement = document.getElementById('vagas-livres');

let currentUser = null;

// --- PONTO CENTRAL DA APLICAÇÃO ---
// Esta função é chamada assim que a página carrega e verifica o estado do login.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // USUÁRIO ESTÁ LOGADO
        currentUser = user;
        setupUIForLoggedInUser(user);
        listenToVagas(); // Só começa a "ouvir" as vagas DEPOIS de confirmar o login
    } else {
        // USUÁRIO NÃO ESTÁ LOGADO
        // Redireciona para a página de login
        window.location.href = 'login.html';
    }
});

// --- Funções de Configuração da UI ---

function setupUIForLoggedInUser(user) {
    // Mostra as informações do usuário e o botão de sair
    userNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email;
    userInfoDiv.style.display = 'flex';

    // Adiciona o evento de clique para o botão de sair
    btnLogout.addEventListener('click', () => {
        signOut(auth).catch(error => console.error("Erro ao fazer logout:", error));
    });

    // Adiciona eventos de clique para os botões das vagas
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`btn-reservar-${i}`).addEventListener('click', () => reservarVaga(i));
        document.getElementById(`btn-checkin-${i}`).addEventListener('click', () => fazerCheckin(i));
        document.getElementById(`btn-cancelar-${i}`).addEventListener('click', () => cancelarReserva(i));
    }
}

// --- Funções de Interação com o Firebase ---

function listenToVagas() {
    const vagasRef = ref(database, 'vagas/');
    onValue(vagasRef, (snapshot) => {
        const vagasData = snapshot.val();
        renderVagas(vagasData);
    });
}

function reservarVaga(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    // Usaremos a lógica avançada que você desenvolveu
    const expirationTime = Date.now() + 180 * 1000; // 3 minutos
    set(vagaRef, {
        status: "reservada",
        tempoExpiracao: expirationTime,
        reservadoPor: currentUser.uid
    });
}

function fazerCheckin(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    const expirationTime = Date.now() + 60 * 1000; // 60 segundos
    set(vagaRef, {
        status: "estacionando",
        tempoExpiracao: expirationTime,
        reservadoPor: currentUser.uid
    });
}

function cancelarReserva(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, { status: false, tempoExpiracao: null, reservadoPor: null });
}

// --- Função de Renderização ---

function renderVagas(vagasData) {
    if (!vagasData) {
        contadorVagasLivresElement.textContent = "Carregando dados...";
        return;
    }

    let vagasLivres = 0;
    for (let i = 1; i <= 4; i++) {
        const vagaElement = document.getElementById(`vaga-${i}`);
        const vagaData = vagasData[`vaga${i}`] || { status: false };
        const isOwner = currentUser && currentUser.uid === vagaData.reservadoPor;

        const statusElement = vagaElement.querySelector('.status');
        const btnReservar = vagaElement.querySelector('.btn-reservar');
        const btnCheckin = vagaElement.querySelector('.btn-checkin');
        const btnCancelar = vagaElement.querySelector('.btn-cancelar');

        // Reset visual
        btnReservar.style.display = 'none';
        btnCheckin.style.display = 'none';
        btnCancelar.style.display = 'none';
        vagaElement.className = 'vaga'; // Reseta todas as classes de estado

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
            if (currentUser) {
                btnReservar.style.display = 'block';
            }
            vagasLivres++;
        }
    }
    contadorVagasLivresElement.textContent = `${vagasLivres} VAGAS DISPONÍVEIS`;
}

