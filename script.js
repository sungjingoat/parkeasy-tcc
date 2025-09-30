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
}

// DELEGAÇÃO DE EVENTOS: A forma mais robusta de garantir que os cliques funcionem.
containerVagas.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName !== 'BUTTON' || !target.id) return;

    const parts = target.id.split('-');
    if (parts.length !== 3) return;

    const action = parts[1];
    const numeroVaga = parseInt(parts[2], 10);

    if (isNaN(numeroVaga)) return;

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

// --- Funções de Ação (Simplificadas, sem temporizadores) ---

function reservarVaga(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, {
        status: "reservada",
        reservadoPor: currentUser.uid
    });
}

function fazerCheckin(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, {
        status: "estacionando",
        reservadoPor: currentUser.uid
    });
}

function cancelarReserva(numeroVaga) {
    if (!currentUser) return;
    const vagaRef = ref(database, `vagas/vaga${numeroVaga}`);
    set(vagaRef, { status: false, reservadoPor: null });
}


// --- FUNÇÃO DE RENDERIZAÇÃO (Simplificada, sem temporizadores) ---
function renderVagas(vagasData) {
    if (!vagasData) {
        contadorVagasLivresElement.textContent = "A carregar dados...";
        return;
    }

    let vagasLivres = 0;
    for (let i = 1; i <= 4; i++) {
        const vagaKey = `vaga${i}`;
        const vagaElement = document.getElementById(vagaKey);
        const vagaData = vagasData[vagaKey] || { status: false };
        const isOwner = currentUser && currentUser.uid === vagaData.reservadoPor;

        const statusElement = vagaElement.querySelector('.status');
        const btnReservar = document.getElementById(`btn-reservar-${i}`);
        const btnCheckin = document.getElementById(`btn-checkin-${i}`);
        const btnCancelar = document.getElementById(`btn-cancelar-${i}`);
        
        // Limpeza
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
            }
        } else if (vagaData.status === "estacionando") {
            vagaElement.classList.add('estacionando');
            statusElement.textContent = 'ESTACIONANDO';
            if (isOwner) {
                btnCancelar.style.display = 'block';
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

