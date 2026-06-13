import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendEmailVerification, reload
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, deleteDoc, getDocs, query, orderBy, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAOxt-SvqNBIEetp44vraAbNIsHJCmsT5Q",
  authDomain:        "kanguro-ind.firebaseapp.com",
  projectId:         "kanguro-ind",
  storageBucket:     "kanguro-ind.firebasestorage.app",
  messagingSenderId: "489504043781",
  appId:             "1:489504043781:web:cab742e1076f5297c33d6c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ── Usuarios ──────────────────────────────────────────

export async function registerUser(name, phone, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  // Usa meta/setup para saber si ya existe un developer (evita listar la colección users)
  const setupRef  = doc(db, 'meta', 'setup');
  const setupSnap = await getDoc(setupRef);
  const role = !setupSnap.exists() ? 'developer' : 'user';
  await setDoc(doc(db, 'users', user.uid), { name, phone, email, role, createdAt: serverTimestamp() });
  if (!setupSnap.exists()) {
    await setDoc(setupRef, { developerCreated: true, createdAt: serverTimestamp() });
  }
  await sendEmailVerification(user);
  return user;
}

export async function ensureUserDoc(user, name) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  // Usuario existe en Auth pero no en Firestore (registro interrumpido): créalo
  const setupRef  = doc(db, 'meta', 'setup');
  const setupSnap = await getDoc(setupRef);
  const role = !setupSnap.exists() ? 'developer' : 'user';
  const data = { name: name || user.email, email: user.email, role, createdAt: serverTimestamp() };
  await setDoc(ref, data);
  if (!setupSnap.exists()) {
    await setDoc(setupRef, { developerCreated: true, createdAt: serverTimestamp() });
  }
  return data;
}

export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logoutUser() { await signOut(auth); }

export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

export async function reloadUser() {
  if (auth.currentUser) await reload(auth.currentUser);
  return auth.currentUser;
}

export function onAuthChange(cb) { return onAuthStateChanged(auth, cb); }

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function getAllUsers() {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ── Comentarios ───────────────────────────────────────

export async function getComments() {
  const snap = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addComment(uid, name, text) {
  await addDoc(collection(db, 'comments'), { uid, name, text, createdAt: serverTimestamp() });
}

export async function deleteComment(id) {
  await deleteDoc(doc(db, 'comments', id));
}

// ── Galería ───────────────────────────────────────────

export async function getGallery() {
  const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getGalleryByCategory(category) {
  const snap = await getDocs(query(
    collection(db, 'gallery'),
    orderBy('createdAt', 'desc')
  ));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.category === category);
}

export async function addGalleryItem(url, caption, category) {
  await addDoc(collection(db, 'gallery'), { url, caption, category, createdAt: serverTimestamp() });
}

export async function deleteGalleryItem(id) {
  await deleteDoc(doc(db, 'gallery', id));
}

// ── Pedidos ───────────────────────────────────────────

export async function addOrder(uid, name, phone, email, data) {
  await addDoc(collection(db, 'orders'), {
    uid, name, phone, email, ...data,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

export async function getOrders() {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserOrders(uid) {
  const snap = await getDocs(query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc')
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.uid === uid);
}

export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, 'orders', id), { status });
}

export async function deleteOrder(id) {
  await deleteDoc(doc(db, 'orders', id));
}

// ── Productos ─────────────────────────────────────────

export async function getProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveProduct(id, data) {
  await setDoc(doc(db, 'products', id), data, { merge: true });
}
