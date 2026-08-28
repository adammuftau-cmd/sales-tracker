import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline persistence so the app keeps working with no connection, and syncs
// automatically across devices once back online.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

let currentUid = null;
export function getUid() { return currentUid; }

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUid = user ? user.uid : null;
    callback(user);
  });
}

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export function signOutUser() {
  return signOut(auth);
}

// ---- Generic collection helpers, scoped to the signed-in user ----
function col(name) {
  if (!currentUid) throw new Error('Not signed in');
  return collection(db, 'users', currentUid, name);
}

export function listenCollection(name, orderField, cb) {
  const q = query(col(name), orderBy(orderField, 'desc'));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    cb(items);
  }, (err) => console.error(`listen(${name}) failed:`, err));
}

export function addItem(name, data) {
  return addDoc(col(name), data);
}
export function updateItem(name, id, data) {
  return updateDoc(doc(db, 'users', currentUid, name, id), data);
}
export function deleteItem(name, id) {
  return deleteDoc(doc(db, 'users', currentUid, name, id));
}
