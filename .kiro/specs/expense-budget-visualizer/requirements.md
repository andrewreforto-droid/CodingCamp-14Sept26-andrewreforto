# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses and visualize spending distribution by category. Users can add and delete transactions, view a running total balance, and see a pie chart of their spending broken down by category (Food, Transport, Fun). All data is persisted in the browser's Local Storage with no backend server required. The application is implemented using HTML, CSS, and Vanilla JavaScript, and is compatible with modern desktop browsers (Chrome, Firefox, Edge, Safari).

---

## Glossary

- **App**: The Expense & Budget Visualizer web application running in the user's browser.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable on-screen list displaying all stored transactions.
- **Input_Form**: The HTML form through which the user enters transaction data before submission.
- **Balance_Display**: The UI element at the top of the page that shows the current total of all transaction amounts.
- **Category**: One of the three predefined spending labels — Food, Transport, or Fun — assigned to each transaction.
- **Chart**: The pie chart that visualises spending distribution by category.
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Validator**: The client-side input validation logic that checks form field values before a transaction is saved.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record a new transaction quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for the item name (maximum 100 characters), a numeric field for the amount (range 0.01–999,999,999.99), and a dropdown selector for the category.
2. THE Input_Form dropdown SHALL offer exactly three category options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form with all fields filled and a valid amount, THE App SHALL create a new Transaction and add it to the Transaction_List within 1 second.
4. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty and does not exceed 100 characters, the amount field contains a value in the range 0.01–999,999,999.99, and a category has been selected.
5. IF the Validator detects that any required field is empty, the item name exceeds 100 characters, or the amount is outside 0.01–999,999,999.99, THEN THE App SHALL display an inline validation error message adjacent to each invalid field identifying the specific validation failure and SHALL NOT save the transaction.
6. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields: the item name field to empty, the amount field to empty, and the category dropdown to its unselected placeholder state.
7. IF the user enters an item name exceeding 100 characters, THEN THE App SHALL display a validation error adjacent to the item name field and SHALL NOT save the transaction.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction in chronological insertion order, showing the item name (up to 100 characters), amount (as a positive numeric value up to 999,999,999.99 with 2 decimal places), and category label for each entry.
2. WHILE the number of transactions exceeds the visible area of the Transaction_List container, THE Transaction_List SHALL be scrollable via vertical scroll only, without shifting, overlapping, or resizing any other page elements outside the Transaction_List container.
3. WHEN the App loads in the browser, THE Transaction_List SHALL render all transactions previously persisted in Local_Storage, displaying them in the same insertion order in which they were saved.
4. IF Local_Storage is unavailable or returns a read error on App load, THEN THE Transaction_List SHALL display an error message indicating that transaction history could not be loaded.
5. WHEN no transactions are stored, THE Transaction_List SHALL display a placeholder message indicating that no expenses have been recorded, and no transaction rows shall be rendered.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete individual transactions, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a clearly labelled delete control for each Transaction entry.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL display a confirmation prompt asking the user to confirm the deletion before proceeding.
3. WHEN the user confirms the deletion, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage within 500 milliseconds.
4. WHEN the user cancels the confirmation prompt, THE App SHALL take no action and the Transaction SHALL remain in the Transaction_List and Local_Storage.
5. WHEN a Transaction is deleted and confirmed, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds.
6. WHEN a Transaction is deleted and confirmed, THE Chart SHALL update to reflect the revised spending distribution within 500 milliseconds.
7. IF Local_Storage is unavailable when a deletion is attempted, THEN THE App SHALL display an error message informing the user that the transaction could not be deleted and the Transaction SHALL remain visible in the Transaction_List.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total expenditure displayed prominently, so that I can understand my overall spending at a glance.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the page and SHALL show the sum of all Transaction amounts formatted as a monetary value with a currency symbol and two decimal places (e.g., $1,234.56).
2. WHEN a new Transaction is added, THE Balance_Display SHALL recalculate and display the updated total within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL recalculate and display the updated total within 500 milliseconds without requiring a page reload.
4. WHEN no transactions exist, THE Balance_Display SHALL display a total of $0.00.
5. IF the sum of all Transaction amounts exceeds the representable display range, THE Balance_Display SHALL display a formatted overflow indicator (e.g., ">$999,999,999.99") rather than an incorrect or truncated value.

---

### Requirement 5: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand how my money is distributed.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution as a pie chart with one segment per Category that has at least one associated Transaction, where each segment's arc size is proportional to that Category's share of total spending.
2. THE Chart SHALL label each segment with the Category name and its percentage of total spending rounded to one decimal place.
3. WHEN a new Transaction is added, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
4. WHEN a Transaction is deleted, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
5. WHEN no transactions exist, THE Chart SHALL display a placeholder message replacing the chart canvas entirely, indicating there is no data to visualise.
6. WHERE Chart.js is available as a dependency, THE App SHALL use Chart.js to render the pie chart.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialise and write the updated transaction collection to Local_Storage within 500 milliseconds of the addition being confirmed.
2. WHEN a Transaction is deleted, THE App SHALL serialise and write the updated transaction collection to Local_Storage within 500 milliseconds of the deletion being confirmed.
3. WHEN the App loads, THE App SHALL read and deserialise the transaction collection from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to match the persisted state within 1 second.
4. IF Local_Storage is unavailable or reading from Local_Storage produces a parse error, THEN THE App SHALL initialise with an empty transaction collection and SHALL display an error message informing the user that data could not be loaded.
5. IF writing to Local_Storage fails, THEN THE App SHALL display an error message informing the user that the transaction could not be saved, and the transaction collection displayed SHALL remain consistent with the last successfully persisted state.

---

### Requirement 7: File and Code Structure

**User Story:** As a developer, I want the codebase to follow a strict single-file-per-type structure, so that the project remains easy to navigate and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the root level, exactly one CSS file located inside a `css/` directory, and exactly one JavaScript file located inside a `js/` directory.
2. THE App SHALL require no build tools, no package manager installation step, and no backend server to run.
3. THE App SHALL function correctly when opened directly in a browser as a local file (via `file://` protocol) or served from a static host.
4. IF the project contains more than one CSS file inside `css/` or more than one JavaScript file inside `js/`, THE project structure SHALL be considered non-compliant.
5. THE App SHALL use only relative paths for all internal file references (CSS, JS, assets) to ensure portability across different directories and static hosts.

---

### Requirement 8: Browser Compatibility

**User Story:** As a user, I want the app to work across modern browsers, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL render and function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari on desktop operating systems.
2. THE App SHALL use only Web APIs and JavaScript features available natively in Chrome, Firefox, Edge, and Safari current stable releases without requiring polyfills or transpilation.
3. WHEN any page or view is loaded in a supported browser, THE App SHALL display all interactive elements — including buttons, forms, and the chart — in a fully operable state with no layout breakage or JavaScript errors logged to the browser console.

---

### Requirement 9: Performance and Responsiveness

**User Story:** As a user, I want the interface to feel fast and responsive, so that interactions do not feel sluggish.

#### Acceptance Criteria

1. WHEN the user submits the Input_Form, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds on a modern desktop browser.
2. WHEN the user deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds on a modern desktop browser.
3. THE App SHALL complete its initial load and render the stored transaction data within 2 seconds on a standard broadband connection (minimum 25 Mbps, latency ≤50ms).
4. IF the Transaction_List contains more than 500 transactions, THE App SHALL still update the Transaction_List, Balance_Display, and Chart within 500 milliseconds of the user submitting the Input_Form or deleting a Transaction.
5. WHEN the App completes its initial load, THE App SHALL render a Transaction_List of up to 500 stored transactions without truncation or pagination within the 2-second budget.
