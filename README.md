# Ledger — Shop Tracker (PWA)

A installable, offline-capable shop management app: daily sales entry, inventory,
expenses, an auto-updating debt tracker, a monthly budget sheet, and a dashboard
that rolls performance up from daily → weekly → monthly → yearly.

Because you asked for sync across multiple devices with a login, this app uses
**Firebase** (free tier) as its backend — Firebase Authentication for sign-in and
Cloud Firestore for data, with offline persistence built in. The app itself is
still 100% static files, so it hosts perfectly on **GitHub Pages**.

---

## 1. Create your Firebase project (5 minutes, free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Name it anything (e.g. "my-shop-ledger"). You can disable Google Analytics — not needed.
2. In the left sidebar, go to **Build → Authentication → Get started**. Under **Sign-in method**, enable **Email/Password**.
3. Go to **Build → Firestore Database → Create database**. Choose a location close to you (e.g. `eur3` or any nearby region) and start in **production mode**.
4. Once created, go to the **Rules** tab and replace the rules with the following, then click **Publish**. This ensures each shop owner can only ever read or write their own data:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

5. Go to **Project settings** (gear icon, top left) → scroll to **Your apps** → click the **</>** (web) icon → register an app (any nickname) → **do not** check "Firebase Hosting". You'll be shown a `firebaseConfig` object like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "my-shop-ledger.firebaseapp.com",
     projectId: "my-shop-ledger",
     storageBucket: "my-shop-ledger.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

6. Open `js/firebase-config.js` in this project and paste your values in. **It's safe to commit this file to a public GitHub repo** — these are public client identifiers, not secrets. Your data is protected by the Firestore rules from step 4, not by hiding this file.

---

## 2. Put it on GitHub and turn on Pages

1. Create a new GitHub repository and push this whole folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", pick your main branch and the `/ (root)` folder, then **Save**.
4. After a minute your app is live at `https://<your-username>.github.io/<repo-name>/`.

> ⚠️ PWAs require **HTTPS** to install and to register a service worker — GitHub Pages gives you this automatically, so no extra setup is needed.

---

## 3. Install it on Android

1. Open your GitHub Pages URL in **Chrome** on your Android phone.
2. Sign up for an account (top of the app) — this is your shop's login, usable on any device.
3. Tap the **⋮** menu → **Add to Home screen** / **Install app**. Chrome may also prompt you automatically after a few visits.
4. The app now opens full-screen from your home screen like a native app, and keeps working offline — it syncs any changes automatically once you're back online, on every device you sign into.

---

## What's included

| Area | What it does |
|---|---|
| **Dashboard** | Revenue, COGS, gross profit, expenses, net profit, and outstanding debt — switchable between Today / This Week / This Month / This Year, plus a revenue-vs-expenses trend chart and best/lowest sellers. |
| **Sales** | Log a sale with one or more products; price and cost are pulled from Inventory automatically. Stock is deducted the moment a sale is saved. Choose Cash or Credit — Credit sales create a linked debt automatically. |
| **Inventory** | Add/edit/delete products with cost price, sell price, stock quantity, and a low-stock alert threshold. |
| **Expenses** | Log expenses by category (Rent, Utilities, Transport, Salaries, Supplies, Maintenance, Marketing, Other) with notes. |
| **Debt Tracker** | Every credit sale becomes a debt automatically. Record partial or full payments — balance and status (Unpaid / Partial / Paid / Overdue) update themselves. You can also add debts manually. |
| **Budget Sheet** | Set a planned amount per category per month; actual spend is pulled live from your logged Expenses, with a progress bar and over-budget warning. |

All figures are shown in **Ghana Cedis (GH₵)** — you can change this by editing the `fmtMoney` function in `js/calc.js`.

## How profit is calculated

- **Cost of Goods Sold (COGS)** = sum of each sold item's cost price × quantity, at the moment of sale.
- **Gross profit** = Revenue − COGS.
- **Net profit** = Gross profit − Expenses (for the selected period).
- Credit sales count toward revenue immediately (standard accrual accounting) and simultaneously create a debt — so your profit reporting and your debt tracker never disagree with each other.

## Local development

No build step is needed. To preview changes before pushing, run any static file
server from this folder, e.g.:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000`. (Firebase Auth/Firestore need `localhost` or
your real deployed domain to be added under **Authentication → Settings →
Authorized domains** — `localhost` is included by default.)
