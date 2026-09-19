# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a zero-dependency, client-side expense tracker across three files (`index.html`, `css/styles.css`, `js/app.js`). The implementation follows the unidirectional data-flow design: CONFIG → Validator → Store → Renderer → EventHandlers, all wrapped in a single IIFE. Chart.js is loaded via CDN. All tasks are ordered so each step integrates cleanly into the previous one.

---

## Tasks

- [x] 1. Scaffold project files and static HTML structure
  - Create `index.html` at the root with the full page skeleton: balance display section, input form (name field, amount field, category dropdown, submit button), transaction list container, chart canvas, and error banner placeholder
  - Create `css/styles.css` inside `css/` with base reset, layout, and placeholder rules for all UI regions (balance, form, list, chart, error banner)
  - Create `js/app.js` inside `js/` containing only an empty IIFE wrapper and the `CONFIG` frozen constant object
  - Link `css/styles.css` and `js/app.js` using relative paths; add Chart.js CDN `<script>` tag in `index.html`
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 8.2_

- [x] 2. Implement Validator module and property-based tests
  - [x] 2.1 Implement `Validator` inside the IIFE
    - Write `Validator.sanitizeName(raw)` — trims whitespace only
    - Write `Validator.parseAmount(raw)` — returns a finite number or `null`
    - Write `Validator.validateTransaction(name, amountStr, category)` — enforces name non-empty after trim, length ≤ 100, amount in [0.01, 999,999,999.99], category in `CONFIG.CATEGORIES`; returns `{ valid, errors }` object
    - _Requirements: 1.4, 1.5, 1.7_

  - [ ]* 2.2 Write property test — Property 2: Valid inputs always pass validation
    - Create `tests/index.html` loading QUnit and fast-check via CDN; set up test harness
    - **Property 2: Valid inputs always pass validation**
    - Generators: name 1–100 alphanumeric chars, amount float in [0.01, 999,999,999.99], category from `CONFIG.CATEGORIES`
    - Assert `Validator.validateTransaction(name, amount, category).valid === true`
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 2.3 Write property test — Property 3: Invalid inputs always fail validation
    - **Property 3: Invalid inputs always fail validation**
    - Generators: empty names, names > 100 chars, amounts ≤ 0 / > max / non-numeric, invalid category strings
    - Assert `Validator.validateTransaction(...).valid === false` with at least one error key present
    - **Validates: Requirements 1.4, 1.5, 1.7**

  - [ ]* 2.4 Write property test — Property 7: Whitespace-only names are rejected
    - **Property 7: Whitespace-only names are rejected**
    - Generators: strings of spaces, tabs, and newlines of arbitrary length
    - Assert `Validator.validateTransaction(whitespace, ...).valid === false` with a `name` error present
    - **Validates: Requirements 1.4, 1.5**

- [x] 3. Implement Store module
  - [x] 3.1 Implement in-memory state and `localStorage` I/O
    - Write private `_transactions` array and `_saveToStorage()` helper with `try/catch` around `JSON.stringify` + `localStorage.setItem`
    - Implement `Store.load()`: reads `localStorage[CONFIG.LS_KEY]`, parses JSON inside `try/catch`; on failure initialises to `[]` and sets an internal error flag
    - Implement `Store.getAll()`: returns a shallow copy of `_transactions`
    - Implement `Store.add(transaction)`: pushes to array, calls `_saveToStorage`; on write failure reverts push and returns `{ ok: false, error }`
    - Implement `Store.remove(id)`: filters array, calls `_saveToStorage`; on write failure restores prior array and returns `{ ok: false, error }`
    - Use `crypto.randomUUID()` for id generation with `Date.now() + Math.random()` fallback
    - _Requirements: 3.3, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Implement `Store.getTotalBalance()` and `Store.getCategoryTotals()`
    - `getTotalBalance()`: sums all `transaction.amount` values; returns `0` for empty array
    - `getCategoryTotals()`: reduces transactions into a `{ Food, Transport, Fun }` object, initialising each bucket to `0`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

  - [ ]* 3.3 Write property test — Property 1: Serialization round-trip
    - **Property 1: Serialization round-trip**
    - Generator: non-empty arrays of valid `Transaction` objects
    - Assert `JSON.parse(JSON.stringify(txns))` is deeply equal to `txns`
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 3.4 Write property test — Property 4: Balance equals sum of all transaction amounts
    - **Property 4: Balance equals sum of all transaction amounts**
    - Generator: arrays of 0–100 transactions with valid amounts
    - Assert `Store.getTotalBalance()` equals `txns.reduce((s, t) => s + t.amount, 0)` within 0.005
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]* 3.5 Write property test — Property 5: Category totals partition the full balance
    - **Property 5: Category totals partition the full balance**
    - Generator: mixed-category transaction arrays (1–100 items)
    - Assert `Object.values(getCategoryTotals()).reduce((s, v) => s + v, 0)` equals `getTotalBalance()` within 0.005
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 3.6 Write property test — Property 6: Adding then removing a transaction is identity
    - **Property 6: Adding then removing a transaction is identity**
    - Generator: single valid transaction + initial array of 0–50 transactions
    - Assert store count and total balance after `add` + `remove` equal their values before the add
    - **Validates: Requirements 3.3, 6.1, 6.2**

- [x] 4. Checkpoint — Validate pure logic before touching the DOM
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Renderer module
  - [x] 5.1 Implement `Renderer.renderList(transactions)`, `Renderer.renderEmptyState()`, and delete control markup
    - Clear the list container and rebuild it from the transactions array; each row shows name, formatted amount (2 decimal places), category label, and a clearly labelled delete button with a `data-id` attribute
    - When array is empty, call `renderEmptyState()` which inserts the no-expenses placeholder message (no transaction rows rendered)
    - _Requirements: 2.1, 2.2, 2.5, 3.1_

  - [x] 5.2 Implement `Renderer.renderBalance(total)`
    - Format total as `$N,NNN.NN` using `toLocaleString` or manual formatting
    - When `total > CONFIG.OVERFLOW_THRESHOLD`, display `>$999,999,999.99`
    - When no transactions exist, display `$0.00`
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 5.3 Implement `Renderer.renderChart(categoryTotals)`
    - Hold a module-level `_chartInstance` reference; call `.destroy()` before re-creating to avoid the canvas-reuse error
    - Build Chart.js pie chart config from `categoryTotals`; assign colors from `CONFIG.CHART_COLORS`; label each segment with category name and percentage rounded to 1 decimal place
    - When all category totals are zero, hide the canvas and show the no-data placeholder message instead
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.4 Implement form feedback and error banner helpers
    - `Renderer.showFormErrors(errors)`: insert inline error messages adjacent to each invalid field
    - `Renderer.clearFormErrors()`: remove all inline error messages
    - `Renderer.resetForm()`: reset all form fields to their default/empty/placeholder state
    - `Renderer.showErrorBanner(message)`: display a dismissible error banner at the top of the page
    - `Renderer.clearErrorBanner()`: remove the error banner
    - _Requirements: 1.5, 1.6, 1.7, 2.4, 3.7, 6.4, 6.5_

- [x] 6. Implement EventHandlers and wire everything together
  - [x] 6.1 Implement `EventHandlers.onFormSubmit(event)`
    - Prevent default form submission; call `Renderer.clearFormErrors()`
    - Read and sanitize field values; call `Validator.validateTransaction`
    - On validation failure: call `Renderer.showFormErrors(errors)` and return
    - On success: build `Transaction` object (with UUID, `Date.now()` timestamp); call `Store.add`; on storage failure call `Renderer.showErrorBanner`; on success call `Renderer.renderList`, `Renderer.renderBalance`, `Renderer.renderChart`, `Renderer.resetForm`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.2, 5.3, 6.1, 9.1_

  - [x] 6.2 Implement `EventHandlers.onDeleteClick(event)` with event delegation
    - Attach a single click listener to the transaction list container; detect clicks on delete buttons via `dataset.id`
    - Display a `window.confirm` prompt asking the user to confirm deletion
    - On confirm: call `Store.remove(id)`; on storage failure call `Renderer.showErrorBanner`; on success call `Renderer.renderList`, `Renderer.renderBalance`, `Renderer.renderChart`
    - On cancel: take no action
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.3, 5.4, 6.2, 9.2_

  - [x] 6.3 Implement `EventHandlers.onDOMContentLoaded()` and bootstrap
    - Call `Store.load()`; if load set an error flag, call `Renderer.showErrorBanner` with the load-failure message
    - Call `Renderer.renderList(Store.getAll())`, `Renderer.renderBalance(Store.getTotalBalance())`, `Renderer.renderChart(Store.getCategoryTotals())`
    - Attach `onFormSubmit` to the form's `submit` event and `onDeleteClick` to the list container's `click` event
    - Register the handler on `DOMContentLoaded`
    - _Requirements: 2.3, 2.4, 4.1, 6.3, 6.4, 9.3_

- [x] 7. Checkpoint — Verify full happy path end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Apply CSS layout and visual styling
  - [x] 8.1 Style global layout, balance display, and error banner
    - Define page layout (flexbox or grid) positioning the balance display at the top, form and list side-by-side or stacked, chart below
    - Style the balance figure prominently (large font, currency formatting visible)
    - Style the error banner with a distinct background color, dismiss button, and top-of-page positioning that does not shift other content
    - _Requirements: 4.1, 2.2, 8.3_

  - [x] 8.2 Style the input form, validation errors, and transaction list
    - Style all form inputs, labels, dropdown, and submit button to be fully operable with clear focus states
    - Style inline validation error messages adjacent to their respective fields (red text, icon, or similar)
    - Style the transaction list with a fixed-height scrollable container (vertical scroll only); ensure scrolling does not shift any element outside the container
    - Style each transaction row to display name, amount, category, and delete button in a readable layout
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.5, 3.1, 8.3_

  - [x] 8.3 Style the chart area and empty-state placeholders
    - Style the chart canvas container with a defined size
    - Style both empty-state placeholder messages (transaction list and chart) to be visually distinct from normal content
    - _Requirements: 5.5, 2.5, 8.3_

- [x] 9. Final checkpoint — Full integration and cross-browser validation
  - Open `index.html` directly via `file://` in Chrome and Firefox; verify no console errors on load, all interactions work (add, delete, reload), chart renders correctly, and localStorage persistence survives a page reload.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests require `tests/index.html` (created in task 2.2) loaded in a browser; no build step needed
- Each task references specific requirements for full traceability
- The IIFE wrapper must be in place from task 1 before any module code is added
- `Renderer.renderChart` must call `.destroy()` on the existing Chart.js instance before re-creating it (see design error-handling table)
- `Store.add` and `Store.remove` must not mutate the in-memory array on `localStorage` write failure

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "3.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
