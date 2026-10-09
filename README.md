
# 🎓 DPST Freedom Dashboard & Bond Tracker

A real-time, scholarship bond tracking web application built with Vanilla JavaScript and Tailwind CSS. Designed to provide DPST scholars with continuous visibility into their service progress, real-time buyout penalty reductions, and historical departure cost simulations.

---

## ⚡ Key Features

- **Continuous Real-Time Timer:** Millisecond-level countdown tracking remaining days, hours, minutes, and seconds served on your scholarship bond.
- **Dual-Currency Pro-Rata Buyout Tracking:** Calculates exact unserved penalties independently for USD and THB components based on live exchange rates.
- **Interactive Departure Simulator:** Scrub across your entire bond timeline using a slider or datepicker to calculate exact pro-rata buyout costs for any hypothetical departure date.
- **Milestone Tracking:** 10% step milestone with dynamic "Last Achieved," "Next Milestone," and "Following Target" date forecasting.
- **Victory Mode & Preview:** Dedicated celebratory popup modal and `canvas-confetti` explosion upon 100% bond completion, testable anytime via browser console by setting `IS_COMPLETED_TEST = true`.
---

## 📁 Repository Structure

```text
dpst-freedom-dashboard/
├── index.html          # Main application HTML structure & UI layout (Root)
├── src/
│   └── app.js          # Main application logic, calculations, DOM rendering, & timers
│   └── input.css       # Custom CSS style sheet.
├── dist/
│   └── styles.css      # Tailwind CSS distribution style sheet.
└── README.md           # Project documentation

```

---

## 🚀 Quick Start

No Node.js, build step, or bundler required!

1. Clone or download this repository.
2. Open `index.html` directly in any web browser, or serve it locally using VS Code **Live Server**.

---

## 🛠️ Customization Guide for DPST Scholars

To adapt this tracker for your own scholarship bond details, update the configuration constants in **`src/app.js`**:

### 1. Update Personal & Bond Constants (`src/app.js`)

Open `src/app.js` and edit the values at the top of the file:

```javascript
// --- USER CONFIGURATION ---
const userName = "Your Name"; // Displays in header title

// --- BOND CONSTANTS ---
// Set your official service start date (YYYY-MM-DD)
const BOND_START_DATE = new Date('2021-07-16T00:00:00+07:00');

// Set the last official day of your full-term service obligation
const BOND_FULL_TERM_LAST_DAY = new Date('2028-05-18T00:00:00+07:00');

// --- PRINCIPAL PENALTY AMOUNTS ---
// Input your original bond principal values (USD & THB listed on your contract)
const ORIGINAL_USD = 411726.83; 
const ORIGINAL_THB = 151712.00;

```

> **Note:** `BOND_END_DATE` is automatically computed as midnight immediately following `BOND_FULL_TERM_LAST_DAY` to ensure accurate daily pro-rata coverage.

### 2. Financial & Exchange Rate Settings (`src/app.js`)

```javascript
// Default fallback USD/THB rate if live API fetch fails
const DEFAULT_USD_THB_RATE = 34.5;

// Bank exchange fee buffer multiplier (e.g., 1.02 adds a 2% buffer)
const FX_FEE_MULTIPLIER = 1.02;

```

---

## 🧪 Testing Victory Mode

To preview the 100% completion state (confetti blast, victory modal, and full-range historical slider):

1. Open the dashboard in your browser.
2. Open Browser Developer Tools Console (`F12` or `Cmd+Option+I` / `Ctrl+Shift+I`).
3. Set the global test flag:
```javascript
IS_COMPLETED_TEST = true;

```


4. To revert to normal real-time progress tracking:
```javascript
IS_COMPLETED_TEST = false;

```

---

## 🧮 How the Pro-Rata Buyout is Calculated

The dashboard applies the standard linear daily pro-rata formula used for government scholarship bond buyouts:

$$\text{Remaining Penalty} = \text{Principal Amount} \times \left( \frac{\text{Remaining Service Time}}{\text{Total Bond Service Time}} \right)$$

* **USD and THB amounts are calculated independently** to preserve exact contractual values.
* **Total THB Equivalent** is dynamically calculated using live market exchange rates fetched via Open Exchange Rates API.

---

## 📄 License

Distributed under the MIT License. Feel free to fork, customize, and share with fellow DPST scholars!
