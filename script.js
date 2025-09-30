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
const containerVagas = document.querySelector('.container-vagas');

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

// A função de setup agora é mais simples
function setupUIForLoggedInUser(user) {
    userNameSpan.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    userInfoDiv.style.display = 'flex';
    btnLogout.addEventListener('click', () => signOut(auth));
}

// NOVO: Delegação de Eventos - Um único "ouvinte" para todos os botões das vagas
containerVagas.addEventListener('click', (event) => {
    const target = event.target;
    // Verifica se o que foi clicado é um botão com um ID válido
    if (target.tagName !== 'BUTTON' || !target.id) return;

    // Extrai a ação e o número da vaga do ID do botão
    // Ex: "btn-reservar-2" -> ["btn", "reservar", "2"]
    const parts = target.id.split('-');
    if (parts.length !== 3) return;

    const action = parts[1]; // "reservar", "checkin", "cancelar"
    const numeroVaga = parseInt(parts[2], 10);

    if (isNaN(numeroVaga)) return;

    // Chama a função correta com base na ação
    switch (action) {
        case 'reservar':
            reservarVaga(numeroVaga);
            break;
        case 'checkin':
            fazerCheckin(numeroVaga);
            break;
        case 'cancelar':
            cancelarReserva(numeroVaga);
            break;
    }
});


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

// --- Lógica do Timer Visual (Reintegrada) ---
function startTimer(vagaKey, expirationTime, displayElement, prefixText, onExpire) {
    if (activeTimers[vagaKey]) {
        clearInterval(activeTimers[vagaKey]);
    }

    const updateText = () => {
        const totalSecondsRemaining = Math.round((expirationTime - Date.now()) / 1000);

        if (totalSecondsRemaining < 0) {
            if (activeTimers[vagaKey]) {
                clearInterval(activeTimers[vagaKey]);
                delete activeTimers[vagaKey];
            }
            onExpire();
            return;
        }

        const minutes = Math.floor(totalSecondsRemaining / 60);
        const seconds = totalSecondsRemaining % 60;
        const fMinutes = String(minutes).padStart(2, '0');
        const fSeconds = String(seconds).padStart(2, '0');

        displayElement.textContent = `${prefixText} (${fMinutes}:${fSeconds})`;
    };

    updateText(); // Mostra o tempo imediatamente
    const intervalId = setInterval(updateText, 1000);
    activeTimers[vagaKey] = intervalId;
}

// --- Função de Renderização ---
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
        const btnReservar = document.getElementById(`btn-reservar-${i}`);
        const btnCheckin = document.getElementById(`btn-checkin-${i}`);
        const btnCancelar = document.getElementById(`btn-cancelar-${i}`);
        
        // Limpeza
        if (activeTimers[vagaKey]) {
            clearInterval(activeTimers[vagaKey]);
            delete activeTimers[vagaKey];
        }
        const timerVisualAntigo = vagaElement.querySelector('.timer-countdown');
        if (timerVisualAntigo) timerVisualAntigo.remove();
        
        btnReservar.style.display = 'none';
        btnCheckin.style.display = 'none';
        btnCancelar.style.display = 'none';
        btnCheckin.textContent = "Estacionar Agora";
        vagaElement.className = 'vaga';

        // Lógica de Estados
        if (vagaData.status === "reservada") {
            vagaElement.classList.add('reservada');
            statusElement.textContent = 'RESERVADA';
            if (isOwner) {
                btnCheckin.style.display = 'block';
                btnCancelar.style.display = 'block';
                if (vagaData.tempoExpiracao) {
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
                const timerElemento = document.createElement('div');
                timerElemento.className = 'timer-countdown';
                vagaElement.appendChild(timerElemento);
                startTimer(vagaKey, vagaData.tempoExpiracao, timerElemento, "Tempo:", () => {
                    cancelarReserva(i);
                });
            }
        } else if (vagaData.status === true) {
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

