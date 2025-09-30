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
let activeTimers = {};

// --- PONTO CENTRAL DA APLICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setupUIForLoggedInUser(user);
        listenToVagas();
    } else {
        window.location.href = 'login.html';
    }
});

function setupUIForLoggedInUser(user) {
    userNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    userInfoDiv.style.display = 'flex';
    btnLogout.addEventListener('click', () => signOut(auth));
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`btn-reservar-${i}`).addEventListener('click', () => reservarVaga(i));
        document.getElementById(`btn-checkin-${i}`).addEventListener('click', () => fazerCheckin(i));
        document.getElementById(`btn-cancelar-${i}`).addEventListener('click', () => cancelarReserva(i));
    }
}

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
    const expirationTime = Date.now() + 180 * 1000;
    set(vagaRef, {
        status: "reservada",
        tempoExpiracao: expirationTime,
        reservadoPor: currentUser.uid
    });
}

function fazerCheckin(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    const expirationTime = Date.now() + 60 * 1000;
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

// --- Lógica do Timer Visual (COM DIAGNÓSTICO) ---
function startTimer(vagaKey, expirationTime, displayElement, prefixText, onExpire) {
    console.log(`[DIAGNÓSTICO] Iniciando temporizador para ${vagaKey}. Tempo de expiração: ${new Date(expirationTime)}`);
    if (!displayElement) {
        console.error(`[ERRO DE DIAGNÓSTICO] O elemento para exibir o temporizador de ${vagaKey} não foi encontrado!`);
        return;
    }

    if (activeTimers[vagaKey]) {
        clearInterval(activeTimers[vagaKey]);
    }

    const intervalId = setInterval(() => {
        const totalSecondsRemaining = Math.round((expirationTime - Date.now()) / 1000);

        if (totalSecondsRemaining < 0) {
            clearInterval(intervalId);
            delete activeTimers[vagaKey];
            onExpire();
            return;
        }

        const minutes = Math.floor(totalSecondsRemaining / 60);
        const seconds = totalSecondsRemaining % 60;
        const fMinutes = String(minutes).padStart(2, '0');
        const fSeconds = String(seconds).padStart(2, '0');

        displayElement.textContent = `${prefixText} (${fMinutes}:${fSeconds})`;
    }, 1000);

    activeTimers[vagaKey] = intervalId;
}

// --- Função de Renderização (com Timers e Diagnóstico) ---
function renderVagas(vagasData) {
    if (!vagasData) {
        contadorVagasLivresElement.textContent = "Carregando dados...";
        return;
    }

    let vagasLivres = 0;
    for (let i = 1; i <= 4; i++) {
        const vagaKey = `vaga-${i}`;
        const vagaElement = document.getElementById(vagaKey);
        const vagaData = vagasData[vagaKey] || { status: false };
        const isOwner = currentUser && currentUser.uid === vagaData.reservadoPor;

        const statusElement = vagaElement.querySelector('.status');
        const btnReservar = vagaElement.querySelector('.btn-reservar');
        const btnCheckin = vagaElement.querySelector('.btn-checkin');
        const btnCancelar = vagaElement.querySelector('.btn-cancelar');
        
        // Limpeza
        if (activeTimers[vagaKey]) {
            clearInterval(activeTimers[vagaKey]);
            delete activeTimers[vagaKey];
        }
        btnCheckin.textContent = "Estacionar Agora";
        const timerVisualAntigo = vagaElement.querySelector('.timer-countdown');
        if (timerVisualAntigo) timerVisualAntigo.remove();
        
        btnReservar.style.display = 'none';
        btnCheckin.style.display = 'none';
        btnCancelar.style.display = 'none';
        vagaElement.className = 'vaga';

        // Lógica de Estados
        if (vagaData.status === "reservada") {
            vagaElement.classList.add('reservada');
            statusElement.textContent = 'RESERVADA';
            if (isOwner) {
                btnCheckin.style.display = 'block';
                btnCancelar.style.display = 'block';
                if (vagaData.tempoExpiracao) {
                    console.log(`[DIAGNÓSTICO] Vaga ${i} está RESERVADA. Tentando iniciar o temporizador no botão.`);
                    startTimer(vagaKey, vagaData.tempoExpiracao, btnCheckin, "Estacionar Agora", () => {
                       cancelarReserva(i); 
                    });
                }
            }
        } else if (vagaData.status === "estacionando") {
            vagaElement.classList.add('estacionando');
            statusElement.textContent = 'ESTACIONANDO';
            if (isOwner) {
                btnCancelar.style.display = 'block';
            }
            if (vagaData.tempoExpiracao) {
                console.log(`[DIAGNÓSTICO] Vaga ${i} está ESTACIONANDO. Tentando criar e iniciar o temporizador visual.`);
                const timerElemento = document.createElement('div');
                timerElemento.className = 'timer-countdown';
                vagaElement.appendChild(timerElemento);
                startTimer(vagaKey, vagaData.tempoExpiracao, timerElemento, "Tempo:", () => {
                    cancelarReserva(i);
                });
            }
        }
        else if (vagaData.status === true) { // Ocupada
            vagaElement.classList.add('ocupada');
            statusElement.textContent = 'OCUPADA';
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

