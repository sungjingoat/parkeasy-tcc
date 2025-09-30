// Importa as funções de Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Seleção dos Elementos da UI ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const btnDoLogin = document.getElementById('btn-do-login');
const loginErrorP = document.getElementById('login-error');

const registerNameInput = document.getElementById('register-name');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const btnDoRegister = document.getElementById('btn-do-register');
const registerErrorP = document.getElementById('register-error');

// --- Lógica para alternar entre formulários ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// --- Lógica de Cadastro ---
btnDoRegister.addEventListener('click', () => {
    const nome = registerNameInput.value;
    const email = registerEmailInput.value;
    const senha = registerPasswordInput.value;

    if (!nome || !email || !senha) {
        registerErrorP.textContent = "Por favor, preencha todos os campos.";
        return;
    }
    registerErrorP.textContent = "";

    createUserWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            // Usuário criado com sucesso. Agora, atualizamos o nome dele.
            const user = userCredential.user;
            return updateProfile(user, {
                displayName: nome
            });
        })
        .then(() => {
            // Nome atualizado, redireciona para a página de vagas
            window.location.href = 'vagas.html';
        })
        .catch((error) => {
            console.error("Erro no cadastro:", error);
            registerErrorP.textContent = "Erro ao cadastrar. Verifique o e-mail e a senha (mínimo 6 caracteres).";
        });
});

// --- Lógica de Login ---
btnDoLogin.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const senha = loginPasswordInput.value;

    if (!email || !senha) {
        loginErrorP.textContent = "Por favor, preencha todos os campos.";
        return;
    }
    loginErrorP.textContent = "";

    signInWithEmailAndPassword(auth, email, senha)
        .then(() => {
            // Login bem-sucedido, redireciona para a página de vagas
            window.location.href = 'vagas.html';
        })
        .catch((error) => {
            console.error("Erro no login:", error);
            loginErrorP.textContent = "E-mail ou senha inválidos.";
        });
});

