# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a zero-dependency, client-side web application built with HTML, CSS, and Vanilla JavaScript. It lets users record personal expense transactions, review them in a scrollable list, track a running total balance, and explore spending distribution through a Chart.js-rendered pie chart — all without a backend or build step.

All state is held in memory during a session and persisted to `localStorage` on every mutation so that data survives page refreshes and browser restarts. The entire application ships as three files: `index.html`, `css/styles.css`, and `js/app.js`. Opening `index.html` directly via the `file://` protocol is sufficient to run the app.

### Design Goals

- **Simplicity**: No framework, no bundler, no package manager — a junior developer should be able to read the full source in one sitting.
- **Correctness**: Pure logic (validation, balance calculation, serialization) is kept separate from DOM manipulation so it can be unit- and property-tested independently.
- **Performance**: All UI updates complete within 100 ms for typical workloads and within 500 ms for lists up to 500 transactions.
- **Resilience**: `localStorage` failures are caught and surfaced as user-visible error messages without crashing the app.

---

## Architecture

The app follows a simple **unidirectional data flow** pattern without a framework:

```
User Action
    │
    ▼
Event Handler (js/app.js)
    │
    ├──► Validator   (pure functions — validate inputs)
    │
    ├──► Store       (in-memory array + localStorage sync)
    │
    └──► Renderer    (DOM + Chart.js updates)
```

All logic lives inside a single IIFE (Immediately Invoked Function Expression) in `js/app.js` to avoid polluting the global scope. Internal modules are plain object literals or groups of named functions.

```
js/app.js
├── CONFIG          – constants (max length, amount bounds, categories, LS key)
├── Validator       – pure validation functions
├── Store           – in-memory state + localStorage I/O
├── Renderer        – DOM mutation + Chart.js wrapper
└── EventHandlers   – wires DOM events to Store + Renderer
```

No module bundler is used; all code resides in one file per the file-structure requirement.

---

## Components and Interfaces

### CONFIG

A frozen constant object:

```js
const CONFIG = Object.freeze({
  MAX_NAME_LENGTH: 100,
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999_999_999.99,
  CATEGORIES: ['Food', 'Transport', 'Fun'],
  LS_KEY: 'ebv_transactions',
  CHART_COLORS: { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' },
  UPDATE_TIMEOUT_MS: 500,   // localStorage write deadline
  OVERFLOW_THRESHOLD: 999_999_999.99,
});
```

### Validator

Pure functions with no side-effects. Returns a result object so callers can display field-specific errors.

```js
/**
 * @typedef {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }} ValidationResult
 */

Validator.validateTransaction(name, amountStr, category) → ValidationResult
Validator.sanitizeName(raw)      → string   // trim only
Validator.parseAmount(raw)       → number | null
```

Rules enforced:
- `name`: non-empty after trim; length ≤ 100 characters.
- `amount`: parseable as a finite number; within [0.01, 999,999,999.99].
- `category`: one of `CONFIG.CATEGORIES`.

### Store

Manages the canonical in-memory array and synchronises with `localStorage`.

```js
Store.load()                         → void     // reads + parses LS; sets internal array
Store.getAll()                       → Transaction[]
Store.add(transaction)               → { ok: boolean, error?: string }
Store.remove(id)                     → { ok: boolean, error?: string }
Store.getTotalBalance()              → number
Store.getCategoryTotals()            → { [category: string]: number }
```

`Store.add` and `Store.remove` write to `localStorage` synchronously inside a `try/catch`. On failure they return `{ ok: false, error: '...' }` without mutating the in-memory array.

### Renderer

All DOM writes are funnelled through Renderer so event handlers stay thin.

```js
Renderer.renderList(transactions)    → void
Renderer.renderBalance(total)        → void
Renderer.renderChart(categoryTotals) → void   // creates or updates Chart.js instance
Renderer.showFormErrors(errors)      → void
Renderer.clearFormErrors()           → void
Renderer.resetForm()                 → void
Renderer.showErrorBanner(message)    → void
Renderer.clearErrorBanner()          → void
Renderer.renderEmptyState()          → void   // for list and chart placeholders
```

`Renderer.renderChart` holds a module-level reference to the Chart.js instance and calls `.destroy()` before re-creating when category data changes. This avoids the "canvas already in use" Chart.js error.

### EventHandlers

```js
EventHandlers.onFormSubmit(event)    → void
EventHandlers.onDeleteClick(event)   → void   // uses event delegation on the list
EventHandlers.onDOMContentLoaded()   → void   // wires everything up and calls Store.load()
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {{
 *   id:        string,   // crypto.randomUUID() — unique per transaction
 *   name:      string,   // 1–100 characters, trimmed
 *   amount:    number,   // finite positive number, 0.01–999,999,999.99
 *   category:  'Food' | 'Transport' | 'Fun',
 *   createdAt: number,   // Date.now() timestamp (ms) — preserves insertion order
 * }} Transaction
 */
```

### Persistence Format

The `localStorage` value stored under `CONFIG.LS_KEY` is a JSON-serialised array of `Transaction` objects:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Coffee",
    "amount": 4.50,
    "category": "Food",
    "createdAt": 1700000000000
  }
]
```

On load, `Store.load()` calls `JSON.parse` inside a `try/catch`. If parsing fails or the value is not an array, the app initialises with `[]` and displays the storage-error banner.

### Derived State (computed on demand, never stored)

| Derived value       | Computed by                  |
|---------------------|------------------------------|
| Total balance       | `Store.getTotalBalance()`    |
| Category totals     | `Store.getCategoryTotals()`  |
| Overflow indicator  | `Renderer.renderBalance()`   |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Serialization round-trip

*For any* non-empty array of valid `Transaction` objects, serializing the array to JSON and then deserializing it must produce an array that is deeply equal to the original.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 2: Valid inputs always pass validation

*For any* item name of 1–100 non-whitespace-only characters, any numeric amount in [0.01, 999,999,999.99], and any value from `CONFIG.CATEGORIES`, `Validator.validateTransaction` must return `{ valid: true }`.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Invalid inputs always fail validation

*For any* input where the name is empty or exceeds 100 characters, or the amount is outside [0.01, 999,999,999.99], or the category is not one of the three allowed values, `Validator.validateTransaction` must return `{ valid: false }` with at least one field error present.

**Validates: Requirements 1.4, 1.5, 1.7**

---

### Property 4: Balance equals sum of all transaction amounts

*For any* collection of transactions, `Store.getTotalBalance()` must equal the arithmetic sum of every `transaction.amount` value in the collection, accurate to floating-point precision (within 0.005).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 5: Category totals partition the full balance

*For any* non-empty collection of transactions, the sum of all values returned by `Store.getCategoryTotals()` must equal `Store.getTotalBalance()`, and every transaction's amount must be accounted for in exactly one category bucket.

**Validates: Requirements 5.1, 5.2**

---

### Property 6: Adding then removing a transaction is identity

*For any* valid transaction added to a store that initially contains *n* transactions, deleting that same transaction must restore the store to exactly its prior state — same count (*n*) and same total balance.

**Validates: Requirements 3.3, 6.1, 6.2**

---

### Property 7: Whitespace-only names are rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), `Validator.validateTransaction` must return `{ valid: false }` with a name error present.

**Validates: Requirements 1.4, 1.5**

---

## Error Handling

| Failure Scenario | Detection Point | Recovery Action |
|---|---|---|
| `localStorage` read error on load | `Store.load()` catch block | Initialise with `[]`, show error banner |
| `localStorage` parse error on load | `JSON.parse` catch in `Store.load()` | Initialise with `[]`, show error banner |
| `localStorage` write error on add | `Store.add()` catch block | Do NOT mutate in-memory array; return `{ ok: false }`; EventHandler shows error banner |
| `localStorage` write error on delete | `Store.remove()` catch block | Do NOT mutate in-memory array; return `{ ok: false }`; EventHandler shows error banner |
| Form validation failure | `Validator.validateTransaction` | Show inline field errors; do not proceed to Store |
| Chart.js canvas re-use | `Renderer.renderChart` | Call `.destroy()` on existing instance before creating a new one |
| `crypto.randomUUID` unavailable | Feature-detect in `Store.add` | Fall back to `Date.now() + Math.random()` string |

Error banners are non-blocking: they appear in a visually distinct banner at the top of the page and include a dismiss button. They do not prevent the user from continuing to use the app.

---

## Testing Strategy

### PBT Applicability Assessment

PBT is applicable for the pure logic modules (`Validator`, `Store` computed functions, serialization). It is **not** applicable for:
- UI rendering (DOM manipulation, Chart.js output) — covered by snapshot/example tests
- `localStorage` I/O — covered by example-based tests with mocks
- Browser compatibility — covered by manual cross-browser smoke tests

### Recommended Library

**[fast-check](https://github.com/dubzzz/fast-check)** (MIT, actively maintained) — works in any JavaScript environment including browsers and Node.js without a build step when loaded via CDN.

### Unit Tests (example-based)

Use a simple test runner such as [QUnit](https://qunitjs.com/) loaded via CDN in a `tests/index.html` file (no build step required).

Focus areas:
- `Validator`: each validation rule with concrete valid and invalid inputs
- `Store.getTotalBalance()`: empty array → 0, single item, multiple items
- `Store.getCategoryTotals()`: all three categories represented, only one category
- `Renderer.renderBalance()`: overflow indicator when total > `OVERFLOW_THRESHOLD`
- `Store.load()`: malformed JSON → empty array + error state
- `Store.add()` / `Store.remove()` with mocked `localStorage`

### Property-Based Tests

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: expense-budget-visualizer, Property {N}: {property_text}`

| Property | Test Description | Generators |
|---|---|---|
| P1: Serialization round-trip | `JSON.parse(JSON.stringify(txns))` deep-equals `txns` | Array of valid `Transaction` objects |
| P2: Valid inputs pass validation | `validateTransaction(name, amount, category).valid === true` | Name: 1–100 alphanum chars; amount: float in range; category: pick from enum |
| P3: Invalid inputs fail validation | `validateTransaction(...).valid === false` with errors | Names: empty / 101+ chars; amounts: 0, negative, > max, non-numeric; bad category |
| P4: Balance equals sum | `getTotalBalance(txns) === sum(txns.map(t => t.amount))` | Arrays of 0–100 transactions with valid amounts |
| P5: Category totals partition balance | `sum(Object.values(getCategoryTotals(txns))) === getTotalBalance(txns)` | Mixed-category transaction arrays |
| P6: Add then remove is identity | Store state after add+remove equals initial state | Single valid transaction + initial array |
| P7: Whitespace names rejected | `validateTransaction(whitespace, ...).valid === false` | Strings of spaces/tabs/newlines |

### Integration / Smoke Tests

- Open `index.html` in each target browser; verify no console errors on load.
- Add 3 transactions across all three categories; verify chart renders with 3 segments.
- Reload page; verify all 3 transactions are restored.
- Delete one transaction; verify balance and chart update.
- Simulate `localStorage` full error (mock `setItem` to throw `QuotaExceededError`); verify error banner appears.
