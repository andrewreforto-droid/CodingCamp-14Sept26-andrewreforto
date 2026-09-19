/**
 * Expense & Budget Visualizer
 * Coding Camp Final Project
 *
 * Stack:
 * - HTML
 * - CSS
 * - Vanilla JavaScript
 * - Local Storage
 * - Chart.js
 *
 * Optional challenges implemented:
 * 1) Custom categories
 * 2) Monthly summary view
 * 3) Dark/light mode toggle
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    TRANSACTIONS_KEY: 'ebv_transactions',
    CUSTOM_CATEGORIES_KEY: 'ebv_custom_categories',
    THEME_KEY: 'ebv_theme',
    DEFAULT_CATEGORIES: ['Food', 'Transport', 'Fun'],
    MAX_NAME_LENGTH: 100,
    MAX_CATEGORY_LENGTH: 30,
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 999_999_999_999,
    CHART_PALETTE: [
      '#2563eb',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ef4444',
      '#06b6d4',
      '#ec4899',
      '#84cc16',
      '#f97316',
      '#6366f1'
    ]
  });

  let transactions = [];
  let customCategories = [];
  let chartInstance = null;

  const $ = (id) => document.getElementById(id);

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function saveLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      showError('Could not save data to Local Storage.');
      return false;
    }
  }

  function loadData() {
    try {
      const savedTransactions = safeJsonParse(
        localStorage.getItem(CONFIG.TRANSACTIONS_KEY),
        []
      );
      const savedCategories = safeJsonParse(
        localStorage.getItem(CONFIG.CUSTOM_CATEGORIES_KEY),
        []
      );

      transactions = Array.isArray(savedTransactions)
        ? savedTransactions
            .filter((item) => item && typeof item === 'object')
            .map(normalizeTransaction)
        : [];

      customCategories = Array.isArray(savedCategories)
        ? savedCategories
            .map((category) => String(category).trim())
            .filter(Boolean)
        : [];
    } catch (_error) {
      transactions = [];
      customCategories = [];
      showError('Saved data could not be loaded. The app started with an empty list.');
    }
  }

  function normalizeTransaction(item) {
    const createdAt = normalizeTimestamp(item.createdAt);

    return {
      id: String(item.id || createId()),
      name: String(item.name || item.itemName || 'Untitled expense'),
      amount: Number(item.amount) || 0,
      category: String(item.category || 'Other'),
      createdAt
    };
  }

  function normalizeTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }

    return Date.now();
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getAllCategories() {
    const categories = [...CONFIG.DEFAULT_CATEGORIES, ...customCategories];

    transactions.forEach((transaction) => {
      if (transaction.category && !categories.includes(transaction.category)) {
        categories.push(transaction.category);
      }
    });

    return [...new Set(categories)];
  }

  function formatCurrency(value) {
    const amount = Number(value) || 0;

    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount);
    } catch (_error) {
      return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
    }
  }

  function formatDate(timestamp) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(timestamp));
    } catch (_error) {
      return '';
    }
  }

  function formatMonthLabel(monthValue) {
    const [year, month] = String(monthValue).split('-').map(Number);

    if (!year || !month) return 'Selected month';

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, 1));
  }

  function getMonthValue(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showError(message) {
    $('error-banner-message').textContent = message;
    $('error-banner').classList.remove('hidden');
  }

  function hideError() {
    $('error-banner-message').textContent = '';
    $('error-banner').classList.add('hidden');
  }

  function clearFieldErrors() {
    ['name', 'amount', 'category'].forEach((field) => {
      const error = $(`error-${field}`);
      const input = $(`input-${field}`);

      if (error) error.textContent = '';
      if (input) input.classList.remove('is-invalid');
    });
  }

  function setFieldError(field, message) {
    const error = $(`error-${field}`);
    const input = $(`input-${field}`);

    if (error) error.textContent = message;
    if (input) input.classList.add('is-invalid');
  }

  function validateTransaction(name, rawAmount, category) {
    const errors = {};
    const cleanName = String(name).trim();
    const amount = Number(rawAmount);

    if (!cleanName) {
      errors.name = 'Item name is required.';
    } else if (cleanName.length > CONFIG.MAX_NAME_LENGTH) {
      errors.name = `Maximum ${CONFIG.MAX_NAME_LENGTH} characters.`;
    }

    if (!rawAmount || !Number.isFinite(amount) || amount < CONFIG.MIN_AMOUNT) {
      errors.amount = 'Amount must be greater than 0.';
    } else if (amount > CONFIG.MAX_AMOUNT) {
      errors.amount = 'Amount is too large.';
    }

    if (!getAllCategories().includes(category)) {
      errors.category = 'Please choose a category.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      values: {
        name: cleanName,
        amount,
        category
      }
    };
  }

  function saveTransactions() {
    return saveLocalStorage(CONFIG.TRANSACTIONS_KEY, transactions);
  }

  function saveCategories() {
    return saveLocalStorage(CONFIG.CUSTOM_CATEGORIES_KEY, customCategories);
  }

  function renderCategoryOptions(selectedValue = '') {
    const select = $('input-category');
    const categories = getAllCategories();

    select.innerHTML = '<option value="">Choose category</option>';

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;

      if (category === selectedValue) {
        option.selected = true;
      }

      select.appendChild(option);
    });
  }

  function getTotal(items = transactions) {
    return items.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  function getTransactionsForMonth(monthValue) {
    return transactions.filter(
      (transaction) => getMonthValue(transaction.createdAt) === monthValue
    );
  }

  function getCategoryTotals(items = transactions) {
    return items.reduce((totals, transaction) => {
      const category = transaction.category || 'Other';
      totals[category] = (totals[category] || 0) + Number(transaction.amount || 0);
      return totals;
    }, {});
  }

  function renderOverview() {
    $('balance-display').textContent = formatCurrency(getTotal());
    $('transaction-count').textContent = String(transactions.length);

    const currentMonth = getMonthValue();
    const currentMonthTransactions = getTransactionsForMonth(currentMonth);

    $('current-month-total').textContent = formatCurrency(
      getTotal(currentMonthTransactions)
    );
    $('current-month-label').textContent = formatMonthLabel(currentMonth);

    const countText =
      transactions.length === 1
        ? '1 item'
        : `${transactions.length} items`;

    $('list-count-badge').textContent = countText;
  }

  function renderTransactionList() {
    const list = $('transaction-list');
    list.innerHTML = '';

    if (transactions.length === 0) {
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-state__inner">
            <div class="empty-icon" aria-hidden="true">◎</div>
            <strong>No transactions yet</strong>
            <p>Add your first expense using the form above.</p>
          </div>
        </li>
      `;
      return;
    }

    const sorted = [...transactions].sort(
      (a, b) => Number(b.createdAt) - Number(a.createdAt)
    );

    sorted.forEach((transaction) => {
      const item = document.createElement('li');
      item.className = 'transaction-item';

      item.innerHTML = `
        <div>
          <p class="transaction-item__name">${escapeHtml(transaction.name)}</p>
          <div class="transaction-item__meta">
            <span class="category-pill">${escapeHtml(transaction.category)}</span>
            <span>${escapeHtml(formatDate(transaction.createdAt))}</span>
          </div>
        </div>

        <div>
          <div class="transaction-item__amount">${escapeHtml(formatCurrency(transaction.amount))}</div>
          <button
            class="delete-button"
            type="button"
            data-delete-id="${escapeHtml(transaction.id)}"
            aria-label="Delete ${escapeHtml(transaction.name)}"
          >
            Delete
          </button>
        </div>
      `;

      list.appendChild(item);
    });
  }

  function renderChart() {
    const canvas = $('spending-chart');
    const emptyState = $('chart-empty-state');
    const categoryTotals = getCategoryTotals();
    const entries = Object.entries(categoryTotals).filter(([, value]) => value > 0);

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    if (entries.length === 0) {
      canvas.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    if (typeof Chart === 'undefined') {
      canvas.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent =
        'Chart.js could not load. Check your internet connection.';
      return;
    }

    canvas.classList.remove('hidden');
    emptyState.classList.add('hidden');

    const labels = entries.map(([category]) => category);
    const values = entries.map(([, value]) => value);

    chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map(
              (_label, index) =>
                CONFIG.CHART_PALETTE[index % CONFIG.CHART_PALETTE.length]
            ),
            borderColor: getComputedStyle(document.documentElement)
              .getPropertyValue('--surface')
              .trim() || '#ffffff',
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 17,
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text')
                .trim()
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const total = values.reduce((sum, value) => sum + value, 0);
                const value = Number(context.raw) || 0;
                const percentage = total
                  ? ((value / total) * 100).toFixed(1)
                  : '0.0';

                return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderMonthlySummary() {
    const monthValue = $('month-filter').value || getMonthValue();
    const monthTransactions = getTransactionsForMonth(monthValue);
    const totals = getCategoryTotals(monthTransactions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    $('month-summary-total').textContent = formatCurrency(getTotal(monthTransactions));
    $('month-summary-count').textContent = String(monthTransactions.length);
    $('month-summary-category').textContent = entries.length ? entries[0][0] : '—';

    $('month-summary-empty').textContent = monthTransactions.length
      ? `Summary for ${formatMonthLabel(monthValue)}.`
      : `No transactions recorded in ${formatMonthLabel(monthValue)}.`;
  }

  function renderAll() {
    renderOverview();
    renderTransactionList();
    renderMonthlySummary();
    renderChart();
  }

  function addTransaction(event) {
    event.preventDefault();
    hideError();
    clearFieldErrors();

    const validation = validateTransaction(
      $('input-name').value,
      $('input-amount').value,
      $('input-category').value
    );

    if (!validation.valid) {
      Object.entries(validation.errors).forEach(([field, message]) => {
        setFieldError(field, message);
      });
      return;
    }

    const transaction = {
      id: createId(),
      name: validation.values.name,
      amount: validation.values.amount,
      category: validation.values.category,
      createdAt: Date.now()
    };

    transactions.push(transaction);

    if (!saveTransactions()) {
      transactions.pop();
      return;
    }

    $('transaction-form').reset();
    renderCategoryOptions();
    renderAll();
    $('input-name').focus();
  }

  function deleteTransaction(event) {
    const button = event.target.closest('[data-delete-id]');
    if (!button) return;

    const id = button.dataset.deleteId;
    const transaction = transactions.find((item) => item.id === id);

    if (!transaction) return;

    const confirmed = window.confirm(
      `Delete "${transaction.name}" from your transactions?`
    );

    if (!confirmed) return;

    const previous = [...transactions];
    transactions = transactions.filter((item) => item.id !== id);

    if (!saveTransactions()) {
      transactions = previous;
      return;
    }

    renderAll();
  }

  function addCustomCategory() {
    const input = $('custom-category-input');
    const error = $('custom-category-error');
    const value = input.value.trim();

    error.textContent = '';

    if (!value) {
      error.textContent = 'Enter a category name.';
      return;
    }

    if (value.length > CONFIG.MAX_CATEGORY_LENGTH) {
      error.textContent = `Maximum ${CONFIG.MAX_CATEGORY_LENGTH} characters.`;
      return;
    }

    const allCategories = getAllCategories();

    if (
      allCategories.some(
        (category) => category.toLowerCase() === value.toLowerCase()
      )
    ) {
      error.textContent = 'This category already exists.';
      return;
    }

    customCategories.push(value);

    if (!saveCategories()) {
      customCategories.pop();
      return;
    }

    renderCategoryOptions(value);
    input.value = '';
    $('custom-category-box').classList.add('hidden');
    $('show-category-form').textContent = '+ Custom category';
  }

  function toggleCategoryForm() {
    const box = $('custom-category-box');
    const isHidden = box.classList.toggle('hidden');

    $('show-category-form').textContent = isHidden
      ? '+ Custom category'
      : 'Close';

    $('custom-category-error').textContent = '';

    if (!isHidden) {
      $('custom-category-input').focus();
    }
  }

  function applyTheme(theme) {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = safeTheme;

    $('theme-icon').textContent = safeTheme === 'dark' ? '☀' : '☾';
    $('theme-label').textContent = safeTheme === 'dark'
      ? 'Light mode'
      : 'Dark mode';

    try {
      localStorage.setItem(CONFIG.THEME_KEY, safeTheme);
    } catch (_error) {
      // Theme preference is non-critical; the app can continue without saving it.
    }

    renderChart();
  }

  function loadTheme() {
    let savedTheme = null;

    try {
      savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
    } catch (_error) {
      savedTheme = null;
    }

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.theme === 'dark'
        ? 'light'
        : 'dark';

    applyTheme(nextTheme);
  }

  function initializeMonthFilter() {
    $('month-filter').value = getMonthValue();
  }

  function attachEvents() {
    $('transaction-form').addEventListener('submit', addTransaction);
    $('transaction-list').addEventListener('click', deleteTransaction);
    $('show-category-form').addEventListener('click', toggleCategoryForm);
    $('add-category-button').addEventListener('click', addCustomCategory);
    $('month-filter').addEventListener('change', renderMonthlySummary);
    $('theme-toggle').addEventListener('click', toggleTheme);
    $('error-banner-dismiss').addEventListener('click', hideError);

    $('custom-category-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomCategory();
      }
    });
  }

  function bootstrap() {
    loadData();
    initializeMonthFilter();
    renderCategoryOptions();
    attachEvents();
    applyTheme(loadTheme());
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
