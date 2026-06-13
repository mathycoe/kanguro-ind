import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';

// ─────────────────────────────────────────────────────
// ⚠️  Reemplazá estos valores con tu firebaseConfig
//     (Configuración del proyecto → Tus apps → Web)
// ─────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
// ─────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Guarda el nombre del usuario localmente (Firebase gratis no tiene displayName fácil sin extra config)
function saveName(uid, name) {
  const map = JSON.parse(localStorage.getItem('kanguro_names') || '{}');
  map[uid] = name;
  localStorage.setItem('kanguro_names', JSON.stringify(map));
}
export function getName(uid) {
  const map = JSON.parse(localStorage.getItem('kanguro_names') || '{}');
  return map[uid] || 'Usuario';
}

export async function registerUser(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  saveName(user.uid, name);
  await sendEmailVerification(user);
  return user;
}

export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

export async function reloadUser() {
  if (auth.currentUser) await reload(auth.currentUser);
  return auth.currentUser;
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}
