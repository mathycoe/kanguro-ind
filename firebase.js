import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAOxt-SvqNBIEetp44vraAbNIsHJCmsT5Q",
  authDomain:        "kanguro-ind.firebaseapp.com",
  projectId:         "kanguro-ind",
  storageBucket:     "kanguro-ind.firebasestorage.app",
  messagingSenderId: "489504043781",
  appId:             "1:489504043781:web:cab742e1076f5297c33d6c"
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
