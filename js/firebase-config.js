// ============================================================================
// FILL THIS IN with your own Firebase project's config.
// See README.md → "1. Create your Firebase project" for step-by-step instructions.
// This file is safe to commit to a public GitHub repo — these are public client
// identifiers, not secret keys. Access is controlled by Firestore security rules.
// ============================================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCs3KulfFsqDZew9I5a6aEC_fJ980td1uI",
  authDomain: "my-shop-tracker-1f0e4.firebaseapp.com",
  projectId: "my-shop-tracker-1f0e4",
  storageBucket: "my-shop-tracker-1f0e4.firebasestorage.app",
  messagingSenderId: "17727731686",
  appId: "1:17727731686:web:de5ed7c7f21cae3972c827",
  measurementId: "G-SPLWYNYG2J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

