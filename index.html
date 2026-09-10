/* =========================================================
   NEXUSAI — FIREBASE AUTHENTICATION
   ========================================================= */

/*
    IMPORTANTE:

    Reemplaza estos valores con los de tu proyecto Firebase.

    Firebase Console
    → Project settings
    → Your apps
    → Web app
    → Firebase SDK setup
*/

const firebaseConfig = {
    apiKey: "AIzaSyBmRqkm8JaPc--aH6TYjyc9F1GjEuA1EL8",
    authDomain: "apexai-62a71.firebaseapp.com",
    projectId: "apexai-62a71",
    storageBucket: "apexai-62a71.firebasestorage.app",
    messagingSenderId: "124979722890",
    appId: "1:124979722890:web:0933707c0764c35d768b73",
    measurementId: "G-75CG03TBS3"
};

/* =========================================================
   FIREBASE
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    initializeFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   INICIALIZAR FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Usamos initializeFirestore con auto-detección de Long Polling para evitar ERR_BLOCKED_BY_CLIENT
const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
});

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});


/* =========================================================
   ELEMENTOS
   ========================================================= */

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");


/* =========================================================
   CAMBIAR LOGIN / REGISTRO
   ========================================================= */

function showLogin() {
    if (!loginForm || !registerForm) return;
    registerForm.classList.remove("active");
    loginForm.classList.add("active");
}

function showRegister() {
    if (!loginForm || !registerForm) return;
    loginForm.classList.remove("active");
    registerForm.classList.add("active");
}

window.showLogin = showLogin;
window.showRegister = showRegister;


/* =========================================================
   MOSTRAR / OCULTAR CONTRASEÑA
   ========================================================= */

function togglePassword(id, button) {
    const input = document.getElementById(id);
    if (!input || !button) return;

    const icon = button.querySelector("i");

    if (input.type === "password") {
        input.type = "text";
        if (icon) {
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
    } else {
        input.type = "password";
        if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    }
}

window.togglePassword = togglePassword;


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(message) {
    const toast = document.getElementById("toast");
    const messageElement = document.getElementById("toastMessage");

    if (!toast || !messageElement) {
        console.log(message);
        return;
    }

    messageElement.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

window.showToast = showToast;


/* =========================================================
   TRADUCIR ERRORES DE FIREBASE
   ========================================================= */

function getFirebaseErrorMessage(error) {
    const code = error?.code || "";

    switch (code) {
        case "auth/invalid-email":
            return "El correo electrónico no es válido.";
        case "auth/user-not-found":
            return "No existe una cuenta con este correo.";
        case "auth/wrong-password":
            return "Correo o contraseña incorrectos.";
        case "auth/invalid-credential":
            return "Correo o contraseña incorrectos.";
        case "auth/email-already-in-use":
            return "Ya existe una cuenta con este correo.";
        case "auth/weak-password":
            return "La contraseña es demasiado débil.";
        case "auth/too-many-requests":
            return "Demasiados intentos. Inténtalo nuevamente más tarde.";
        case "auth/popup-closed-by-user":
            return "Cerraste la ventana de Google.";
        case "auth/popup-blocked":
            return "El navegador bloqueó la ventana de Google.";
        case "auth/cancelled-popup-request":
            return "La ventana de inicio de sesión fue cancelada.";
        case "auth/network-request-failed":
            return "No hay conexión con Firebase.";
        case "auth/operation-not-allowed":
            return "Este método de inicio de sesión no está habilitado en Firebase.";
        default:
            console.error("Firebase Auth Error:", error);
            return "Ocurrió un error. Inténtalo nuevamente.";
    }
}


/* =========================================================
   GUARDAR PERFIL EN FIRESTORE
   ========================================================= */

async function saveUserProfile(user, extraData = {}) {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    try {
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
            const existingData = userSnapshot.data();

            const updateData = {
                uid: user.uid,
                email: user.email || "",
                name:
                    extraData.name ||
                    existingData.name ||
                    user.displayName ||
                    "Usuario",
                photoURL:
                    user.photoURL ||
                    existingData.photoURL ||
                    "",
                updatedAt: serverTimestamp()
            };

            await setDoc(userRef, updateData, { merge: true });
            return;
        }

        /* Usuario nuevo */
        await setDoc(userRef, {
            uid: user.uid,
            name: extraData.name || user.displayName || "Usuario",
            email: user.email || "",
            photoURL: user.photoURL || "",
            provider: extraData.provider || "password",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

    } catch (error) {
        if (error.code === 'failed-precondition' || error.message?.includes('BLOCKED_BY_CLIENT')) {
            console.warn("⚠️ La conexión con Firestore fue bloqueada por el navegador o una extensión. Se omitió la actualización de perfil.");
        } else {
            console.error("Error guardando perfil de usuario:", error);
        }
    }
}


/* =========================================================
   REDIRECCIÓN SI YA ESTÁ AUTENTICADO
   ========================================================= */

let authStateResolved = false;

onAuthStateChanged(auth, async (user) => {
    authStateResolved = true;

    if (!user) return;

    const currentPage = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    const isLoginPage =
        currentPage === "" ||
        currentPage === "index.html" ||
        currentPage === "login.html";

    if (!isLoginPage) return;

    try {
        await saveUserProfile(user);
    } catch (error) {
        console.error("Error sincronizando perfil:", error);
    }

    window.location.href = "app.html";
});


/* =========================================================
   LOGIN
   ========================================================= */

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value;
        const remember = document.getElementById("remember")?.checked;

        if (!email || !password) {
            showToast("Completa todos los campos.");
            return;
        }

        const button = document.getElementById("loginButton");

        if (button) {
            button.classList.add("button-loading");
            button.innerHTML = '<span class="spinner"></span>';
            button.disabled = true;
        }

        try {
            await setPersistence(
                auth,
                remember ? browserLocalPersistence : browserSessionPersistence
            );

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            await saveUserProfile(user, { provider: "password" });

            showToast("Inicio de sesión correcto.");

            setTimeout(() => {
                window.location.href = "app.html";
            }, 500);

        } catch (error) {
            console.error("Login error:", error);
            showToast(getFirebaseErrorMessage(error));
        } finally {
            if (button) {
                button.classList.remove("button-loading");
                button.textContent = "Iniciar sesión";
                button.disabled = false;
            }
        }
    });
}


/* =========================================================
   REGISTRO
   ========================================================= */

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("registerName")?.value.trim();
        const email = document.getElementById("registerEmail")?.value.trim();
        const password = document.getElementById("registerPassword")?.value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;

        if (!name) {
            showToast("Introduce tu nombre.");
            return;
        }

        if (!email) {
            showToast("Introduce tu correo electrónico.");
            return;
        }

        if (password.length < 8) {
            showToast("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Las contraseñas no coinciden.");
            return;
        }

        const button = document.getElementById("registerButton");

        if (button) {
            button.classList.add("button-loading");
            button.innerHTML = '<span class="spinner"></span>';
            button.disabled = true;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            await saveUserProfile(user, {
                name: name,
                provider: "password"
            });

            showToast("Cuenta creada correctamente.");

            setTimeout(() => {
                window.location.href = "app.html";
            }, 700);

        } catch (error) {
            console.error("Register error:", error);
            showToast(getFirebaseErrorMessage(error));
        } finally {
            if (button) {
                button.classList.remove("button-loading");
                button.textContent = "Crear cuenta";
                button.disabled = false;
            }
        }
    });
}


/* =========================================================
   RECUPERAR CONTRASEÑA
   ========================================================= */

async function forgotPassword() {
    const email = document.getElementById("loginEmail")?.value.trim();

    if (!email) {
        showToast("Escribe tu correo primero.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Te enviamos un correo para recuperar tu contraseña.");
    } catch (error) {
        console.error("Password reset error:", error);
        showToast(getFirebaseErrorMessage(error));
    }
}

window.forgotPassword = forgotPassword;


/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

async function loginWithGoogle() {
    try {
        await setPersistence(auth, browserLocalPersistence);

        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        await saveUserProfile(user, {
            name: user.displayName || "Usuario de Google",
            provider: "google"
        });

        showToast("Inicio de sesión con Google correcto.");

        setTimeout(() => {
            window.location.href = "app.html";
        }, 500);

    } catch (error) {
        console.error("Google login error:", error);
        showToast(getFirebaseErrorMessage(error));
    }
}

window.loginWithGoogle = loginWithGoogle;


/* =========================================================
   GOOGLE / GITHUB
   ========================================================= */

function socialLogin(provider) {
    if (provider === "google") {
        loginWithGoogle();
        return;
    }

    showToast(`Inicio de sesión con ${provider} próximamente.`);
}

window.socialLogin = socialLogin;


/* =========================================================
   CERRAR SESIÓN
   ========================================================= */

async function logout() {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout error:", error);
        showToast("No se pudo cerrar la sesión.");
    }
}

window.logout = logout;


/* =========================================================
   USUARIO ACTUAL
   ========================================================= */

function getCurrentUser() {
    return auth.currentUser || null;
}

window.getCurrentUser = getCurrentUser;


/* =========================================================
   LOG
   ========================================================= */

console.log("🔥 NexusAI conectado a Firebase Authentication");
