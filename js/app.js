import { auth, onAuthChange, signUp, signIn, signOutUser, listenCollection, addItem, updateItem, deleteItem, getUid } from './db.js';
import { renderDashboard } from './views/dashboard.js';
import { renderSales, openSaleModal } from './views/sales.js';
import { renderInventory, openProductModal } from './views/inventory.js';
import { renderExpenses, openExpenseModal } from './views/expenses.js';
import { renderDebts, openDebtModal } from './views/debts.js';
import { renderBudget, openBudgetModal } from './views/budget.js';

// ---------------------------------------------------------------------------
// Global state — populated live from Firestore, shared with every view module.
// ---------------------------------------------------------------------------
export const state = {
  products: [],
  sales: [],
  expenses: [],
  debts: [],
  budget: [],
  shopName: localStorage.getItem('ledger_shopname') || 'My Shop'
};

let unsubscribers = [];
const views = ['dashboard', 'sales', 'inventory', 'expenses', 'debts', 'budget'];
const viewTitles = {
  dashboard: 'Dashboard', sales: 'Sales', inventory: 'Inventory',
  expenses: 'Expenses', debts: 'Debt Tracker', budget: 'Budget Sheet'
};
let currentView = 'dashboard';

// ---------------------------------------------------------------------------
// Shared UI helpers, exposed to view modules
// ---------------------------------------------------------------------------
export function toast(msg, isErr = false) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-backdrop').classList.add('active');
}
export function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('active');
  document.getElementById('modal-content').innerHTML = '';
}
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') closeModal();
});

export const actions = {
  addItem, updateItem, deleteItem, toast, openModal, closeModal, getState: () => state
};

// ---------------------------------------------------------------------------
// Rendering / routing
// ---------------------------------------------------------------------------
const renderers = {
  dashboard: () => renderDashboard(document.getElementById('view-dashboard'), state, actions),
  sales: () => renderSales(document.getElementById('view-sales'), state, actions),
  inventory: () => renderInventory(document.getElementById('view-inventory'), state, actions),
  expenses: () => renderExpenses(document.getElementById('view-expenses'), state, actions),
  debts: () => renderDebts(document.getElementById('view-debts'), state, actions),
  budget: () => renderBudget(document.getElementById('view-budget'), state, actions)
};

const fabHandlers = {
  sales: () => openSaleModal(state, actions),
  inventory: () => openProductModal(state, actions),
  expenses: () => openExpenseModal(state, actions),
  debts: () => openDebtModal(state, actions),
  budget: () => openBudgetModal(state, actions)
};

function renderAll() {
  views.forEach((v) => renderers[v]());
}

function switchView(view) {
  currentView = view;
  views.forEach((v) => document.getElementById(`view-${v}`).classList.toggle('active', v === view));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('view-title').textContent = viewTitles[view];
  const fab = document.getElementById('fab-add');
  if (fabHandlers[view]) { fab.classList.add('show'); fab.onclick = fabHandlers[view]; }
  else { fab.classList.remove('show'); }
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ---------------------------------------------------------------------------
// Data subscriptions
// ---------------------------------------------------------------------------
function startListening() {
  const bindings = [
    ['products', 'createdAt', (items) => { state.products = items; }],
    ['sales', 'date', (items) => { state.sales = items; }],
    ['expenses', 'date', (items) => { state.expenses = items; }],
    ['debts', 'createdAt', (items) => { state.debts = items; }],
    ['budget', 'createdAt', (items) => { state.budget = items; }]
  ];
  unsubscribers = bindings.map(([name, field, setter]) =>
    listenCollection(name, field, (items) => { setter(items); renderAll(); })
  );
}
function stopListening() {
  unsubscribers.forEach((u) => u && u());
  unsubscribers = [];
  state.products = []; state.sales = []; state.expenses = []; state.debts = []; state.budget = [];
}

// ---------------------------------------------------------------------------
// Auth screen wiring
// ---------------------------------------------------------------------------
let mode = 'signin'; // or 'signup'
const els = {
  title: document.getElementById('auth-title'),
  sub: document.getElementById('auth-sub'),
  form: document.getElementById('auth-form'),
  shopField: document.getElementById('field-shopname'),
  shopInput: document.getElementById('auth-shopname'),
  email: document.getElementById('auth-email'),
  password: document.getElementById('auth-password'),
  error: document.getElementById('auth-error'),
  submit: document.getElementById('auth-submit'),
  toggleText: document.getElementById('auth-toggle-text'),
  toggleBtn: document.getElementById('auth-toggle-btn')
};

function setMode(next) {
  mode = next;
  const isSignup = mode === 'signup';
  els.title.textContent = isSignup ? 'Set up your ledger' : 'Welcome back';
  els.sub.textContent = isSignup ? 'Create an account to start tracking your shop.' : "Sign in to your shop's ledger.";
  els.shopField.style.display = isSignup ? 'block' : 'none';
  els.submit.textContent = isSignup ? 'Create account' : 'Sign in';
  els.toggleText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
  els.toggleBtn.textContent = isSignup ? 'Sign in' : 'Create one';
  els.error.textContent = '';
}
els.toggleBtn.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.error.textContent = '';
  els.submit.disabled = true;
  const email = els.email.value.trim();
  const password = els.password.value;
  try {
    if (mode === 'signup') {
      const shopName = els.shopInput.value.trim() || 'My Shop';
      await signUp(email, password);
      localStorage.setItem('ledger_shopname', shopName);
    } else {
      await signIn(email, password);
    }
  } catch (err) {
    console.error('Firebase Authentication Error:', err);
    els.error.textContent =
        `${err.code || 'Unknown error'}: ${err.message || 'Something went wrong.'}`;
}
});

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email': 'That email address doesn\u2019t look right.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists with that email — try signing in instead.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/network-request-failed': 'No connection — check your internet and try again.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

document.getElementById('signout-btn').addEventListener('click', () => signOutUser());

// ---------------------------------------------------------------------------
// Auth state -> show the right screen
// ---------------------------------------------------------------------------
onAuthChange((user) => {
  const authScreen = document.getElementById('auth-screen');
  const shell = document.getElementById('app-shell');
  if (user) {
    authScreen.style.display = 'none';
    shell.classList.add('active');
    document.getElementById('user-email-display').textContent = user.email || '';
    document.getElementById('shop-name-display').textContent = state.shopName;
    startListening();
    switchView('dashboard');
  } else {
    stopListening();
    authScreen.style.display = 'flex';
    shell.classList.remove('active');
    els.form.reset();
    setMode('signin');
  }
});
