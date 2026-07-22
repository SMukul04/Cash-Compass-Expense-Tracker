document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('sidebarUserName');
  const logoutBtn = document.getElementById('logoutBtn');

  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');
  const displayName = (userName && userName.trim()) ? userName : (userEmail || 'User');
  if (nameEl) nameEl.textContent = displayName;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
      } catch (_) {}
      window.location.href = 'login.html';
    });
  }

  const formatINR = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  // Expense categories from dashboard
  const EXPENSE_CATEGORIES = [
    { name: 'Shopping', icon: '🛍️', iconCls: 'pink' },
    { name: 'Travel', icon: '✈️', iconCls: 'blue' },
    { name: 'Electricity Bill', icon: '💡', iconCls: 'yellow' },
    { name: 'Loan Repayment', icon: '🏦', iconCls: 'gray' },
    { name: 'Transport', icon: '🚌', iconCls: 'blue' },
    { name: 'Bills', icon: '🧾', iconCls: 'yellow' },
    { name: 'Food', icon: '🍔', iconCls: 'pink' }
  ];

  // Chart elements
  const expenseChart = document.getElementById('expenseChart');
  const chartLabels = document.getElementById('expenseChartLabels');
  // Shared tooltip element
  let tooltipEl = document.getElementById('chartTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartTooltip';
    tooltipEl.className = 'chart-tooltip';
    document.body.appendChild(tooltipEl);
  }

  // Expense data loaded from localStorage
  let allExpenseData = [];

  let currentExpenseData = {};

  // Initialize expense data from localStorage
  function initializeExpenseDataFromStorage() {
    const entries = loadExpenseEntries();
    allExpenseData = entries
      .filter(entry => entry && entry.name && entry.amount) // Only include valid entries
      .map(entry => ({
        category: entry.name,
        amount: Number(entry.amount) || 0,
        date: entry.isoDate || entry.displayDate || ''
      }));
    console.log('Loaded expense data from storage:', allExpenseData.length, 'entries');
    console.log('All expense entries:', allExpenseData);
  }

  function initializeExpenseData() {
    currentExpenseData = {};
    allExpenseData.forEach(item => {
      if (!item.category || !item.amount) return; // Skip invalid items
      currentExpenseData[item.category] = (currentExpenseData[item.category] || 0) + item.amount;
    });
    console.log('Grouped expense data by category:', currentExpenseData);
  }

  function filterExpenseByDate(selectedDate) {
    if (!selectedDate) {
      initializeExpenseData();
      return;
    }
    currentExpenseData = {};
    const filtered = allExpenseData.filter(item => item.date === selectedDate);
    filtered.forEach(item => {
      currentExpenseData[item.category] = (currentExpenseData[item.category] || 0) + item.amount;
    });
  }

  function renderExpenseChart() {
    if (!expenseChart || !chartLabels) return;
    expenseChart.innerHTML = '';
    chartLabels.innerHTML = '';

    const categories = Object.keys(currentExpenseData);
    const values = Object.values(currentExpenseData);
    
    if (categories.length === 0 || values.length === 0) {
      const noData = document.createElement('div');
      noData.style.textAlign = 'center';
      noData.style.color = '#666';
      noData.style.padding = '40px';
      noData.textContent = 'No expense data for selected date';
      expenseChart.appendChild(noData);
      return;
    }

    const maxAmount = Math.max(...values);
    categories.forEach((cat, i) => {
      const amount = currentExpenseData[cat];
      const height = maxAmount > 0 ? (amount / maxAmount) * 280 : 0;

      const bar = document.createElement('div');
      bar.className = 'expense-bar' + (i % 2 ? ' light' : '');
      bar.style.height = Math.min(280, height) + 'px';
      bar.title = `${cat}: ${formatINR(amount)}`;
      bar.addEventListener('mousemove', (ev) => {
        tooltipEl.textContent = `${cat}: ${formatINR(amount)}`;
        tooltipEl.style.left = ev.pageX + 'px';
        tooltipEl.style.top = ev.pageY + 'px';
        tooltipEl.style.opacity = '1';
      });
      bar.addEventListener('mouseleave', () => { tooltipEl.style.opacity = '0'; });
      expenseChart.appendChild(bar);

      const label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = cat;
      chartLabels.appendChild(label);
    });
  }

  // Date filter functionality - check if there's a date set, otherwise show all data
  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    // Handle date filter changes
    dateFilter.addEventListener('change', function() {
      const selectedDate = this.value;
      filterExpenseByDate(selectedDate);
      renderExpenseChart();
    });
  }
  
  // Note: Chart will be initialized after expense list data is loaded (see below)

  // Populate category select in modal
  const categorySelect = document.getElementById('expenseCategory');
  if (categorySelect) {
    EXPENSE_CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
  }

  // Expense list
  const sourcesList = document.getElementById('expenseSourcesList');
  const expenseCategoryFilter = document.getElementById('expenseCategoryFilter');
  const expenseListData = [];

  // Persistence helpers
  const EXPENSE_STORAGE_KEY = 'expenseEntries';
  function loadExpenseEntries() {
    try {
      const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function saveExpenseEntries(entries) {
    try { localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(entries)); } catch (_) {}
  }

  function parseDisplayDateToISO(displayDate) {
    const m = displayDate.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)/);
    if (!m) return displayDate;
    const day = m[1];
    const month = m[2];
    const year = m[3];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const idx = months.indexOf(month);
    if (idx === -1) return displayDate;
    return `${year}-${String(idx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function renderExpenseList() {
    if (!sourcesList) return;
    sourcesList.innerHTML = '';
    const selected = expenseCategoryFilter ? expenseCategoryFilter.value : 'All';

    const items = expenseListData
      .filter(i => selected === 'All' || i.name === selected)
      .sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''));

    items.forEach(data => {
      const row = document.createElement('div');
      row.className = 'source-item';
      row.innerHTML = `
        <div class="source-left">
          <div class="source-icon ${getIconClassForCategory(data.name)}">${getIconForCategory(data.name)}</div>
          <div class="source-info">
            <h3>${data.name}</h3>
            <div class="source-date">${data.displayDate}</div>
          </div>
        </div>
        <div class="source-amount">-${formatINR(Math.abs(data.amount))} <span class="trend-icon">📉</span></div>
        <div class="edit-icon" data-category="${data.name}" data-amount="${data.amount}" data-date="${data.displayDate}" title="Edit expense">✎</div>
        <div class="delete-icon" data-category="${data.name}" data-amount="${data.amount}" data-date="${data.displayDate}" title="Delete expense">×</div>
      `;
      sourcesList.appendChild(row);

      const delBtn = row.querySelector('.delete-icon');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = delBtn.getAttribute('data-category');
        const amt = parseFloat(delBtn.getAttribute('data-amount'));
        const date = delBtn.getAttribute('data-date');
        deleteExpenseItem(delBtn, cat, amt, date);
      });

      const editBtn = row.querySelector('.edit-icon');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = editBtn.getAttribute('data-category');
          const amt = parseFloat(editBtn.getAttribute('data-amount'));
          const date = editBtn.getAttribute('data-date');
          openEditExpenseModal({ name: cat, amount: amt, displayDate: date });
        });
      }
    });
  }

  if (sourcesList) {
    const initial = [
      { name: 'Shopping', date: '17th Feb 2025', amount: 430 },
      { name: 'Travel', date: '13th Feb 2025', amount: 670 },
      { name: 'Electricity Bill', date: '11th Feb 2025', amount: 200 },
      { name: 'Loan Repayment', date: '10th Feb 2025', amount: 600 },
      { name: 'Transport', date: '9th Feb 2025', amount: 300 }
    ];
    // Load from storage or seed defaults
    let stored = loadExpenseEntries();
    if (!stored.length) {
      stored = initial.map(item => ({
        type: 'expense',
        name: item.name,
        amount: item.amount,
        displayDate: item.date,
        isoDate: parseDisplayDateToISO(item.date)
      }));
      saveExpenseEntries(stored);
    }
    stored.forEach(item => expenseListData.push(item));
    renderExpenseList();
    
    // Re-initialize chart data after all list data is loaded
    initializeExpenseDataFromStorage();
    initializeExpenseData();
    renderExpenseChart();
  }

  // Edit expense
  const editExpenseModal = document.getElementById('editExpenseModal');
  const editExpenseForm = document.getElementById('editExpenseForm');
  const editExpenseClose = document.getElementById('editExpenseClose');
  const editExpenseCancel = document.getElementById('editExpenseCancel');
  const editExpenseCategory = document.getElementById('editExpenseCategory');
  const editExpenseAmount = document.getElementById('editExpenseAmount');
  const editExpenseDate = document.getElementById('editExpenseDate');
  let expenseEditOriginal = null;

  // Populate edit categories
  if (editExpenseCategory && editExpenseCategory.options.length <= 1) {
    EXPENSE_CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      editExpenseCategory.appendChild(opt);
    });
  }

  function openEditExpenseModal(entry) {
    expenseEditOriginal = entry;
    if (editExpenseCategory) editExpenseCategory.value = entry.name;
    if (editExpenseAmount) editExpenseAmount.value = entry.amount;
    if (editExpenseDate) {
      const iso = parseDisplayDateToISO(entry.displayDate);
      editExpenseDate.value = iso;
    }
    if (editExpenseModal) editExpenseModal.style.display = 'block';
  }

  function closeEditExpenseModal() { if (editExpenseModal) editExpenseModal.style.display = 'none'; expenseEditOriginal = null; }
  if (editExpenseClose) editExpenseClose.addEventListener('click', closeEditExpenseModal);
  if (editExpenseCancel) editExpenseCancel.addEventListener('click', closeEditExpenseModal);
  window.addEventListener('click', (e) => { if (e.target === editExpenseModal) closeEditExpenseModal(); });

  if (editExpenseForm) {
    editExpenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!expenseEditOriginal) return closeEditExpenseModal();
      const form = new FormData(editExpenseForm);
      const newCat = form.get('category');
      const newAmt = parseFloat(form.get('amount'));
      const newDate = form.get('date');
      // update list data
      const idx = expenseListData.findIndex(it => it.name === expenseEditOriginal.name && it.amount === expenseEditOriginal.amount && it.displayDate === expenseEditOriginal.displayDate);
      if (idx !== -1) {
        expenseListData[idx].name = newCat;
        expenseListData[idx].amount = newAmt;
        expenseListData[idx].displayDate = formatDate(newDate);
        expenseListData[idx].isoDate = newDate;
      }
      // persist
      const stored = loadExpenseEntries();
      const si = stored.findIndex(it => it.name === expenseEditOriginal.name && it.amount === expenseEditOriginal.amount && it.displayDate === expenseEditOriginal.displayDate);
      if (si !== -1) {
        stored[si] = { ...stored[si], name: newCat, amount: newAmt, displayDate: formatDate(newDate), isoDate: newDate };
        saveExpenseEntries(stored);
      }
      // Sync chart data from storage (more reliable than trying to update individual items)
      syncExpenseChartDataWithStorage();
      // re-render list
      renderExpenseList();
      closeEditExpenseModal();
    });
  }

  if (expenseCategoryFilter) {
    // populate filter options from categories
    if (expenseCategoryFilter.options.length === 1) {
      EXPENSE_CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        expenseCategoryFilter.appendChild(opt);
      });
    }
    expenseCategoryFilter.addEventListener('change', () => renderExpenseList());
  }

  function getIconForCategory(name) {
    const found = EXPENSE_CATEGORIES.find(c => c.name === name);
    return found ? found.icon : '🏷️';
  }

  function getIconClassForCategory(name) {
    const found = EXPENSE_CATEGORIES.find(c => c.name === name);
    return found ? found.iconCls : 'gray';
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  }

  function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  function addExpenseRow(data) {
    // push to list data and re-render
    const entry = {
      name: data.name,
      amount: data.amount,
      displayDate: data.date,
      isoDate: parseDisplayDateToISO(data.date)
    };
    expenseListData.unshift(entry);
    const stored = loadExpenseEntries();
    stored.push({ ...entry, type: 'expense' });
    saveExpenseEntries(stored);
    renderExpenseList();
  }

  // Modal controls
  const addExpenseBtn = document.querySelector('.add-expense-btn');
  const addModal = document.getElementById('addExpenseModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.querySelector('.btn-cancel');
  const addExpenseForm = document.getElementById('addExpenseForm');

  if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => addModal.style.display = 'block');
  if (closeBtn) closeBtn.addEventListener('click', () => addModal.style.display = 'none');
  if (cancelBtn) cancelBtn.addEventListener('click', () => addModal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === addModal) addModal.style.display = 'none'; });

  if (addExpenseForm) {
    addExpenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(addExpenseForm);
      const category = formData.get('category');
      const amount = parseFloat(formData.get('amount'));
      const date = formData.get('date');

      if (category && amount && date) {
        // Update list UI
        addExpenseRow({
          name: category,
          amount: amount,
          date: formatDate(date)
        });

        // Sync chart data from storage
        syncExpenseChartDataWithStorage();

        addModal.style.display = 'none';
        addExpenseForm.reset();
      }
    });
  }

  // Delete confirm modal state
  let currentDeleteData = null;

  function showDeleteConfirmModal(name, amount, displayDate) {
    const modal = document.getElementById('deleteConfirmModal');
    const catEl = document.getElementById('deleteCategory');
    const amtEl = document.getElementById('deleteAmount');
    const dateEl = document.getElementById('deleteDate');
    if (modal && catEl && amtEl && dateEl) {
      catEl.textContent = name;
      amtEl.textContent = formatINR(amount);
      dateEl.textContent = displayDate;
      modal.style.display = 'block';
      const confirmBtn = document.getElementById('confirmDeleteButton');
      if (confirmBtn) confirmBtn.onclick = confirmDelete;
    }
  }

  window.closeDeleteConfirmModal = function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.style.display = 'none';
    currentDeleteData = null;
  }

  function deleteExpenseItem(deleteButton, name, amount, displayDate) {
    currentDeleteData = { deleteButton, name, amount, displayDate };
    showDeleteConfirmModal(name, amount, displayDate);
  }

  function confirmDelete() {
    if (!currentDeleteData) return;
    const { deleteButton, name, amount, displayDate } = currentDeleteData;

    // Parse date like "11th Oct 2025" back to YYYY-MM-DD if applicable
    let searchDate = displayDate;
    try {
      const dateMatch = displayDate.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)/);
      if (dateMatch) {
        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthIndex = monthNames.indexOf(month);
        if (monthIndex !== -1) {
          searchDate = `${year}-${String(monthIndex + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
      }
    } catch (_) {}

    // Remove from list data and re-render
    const li = expenseListData.findIndex(it => it.name === name && it.amount === amount && (it.displayDate === displayDate || it.isoDate === searchDate));
    if (li !== -1) expenseListData.splice(li, 1);
    const stored = loadExpenseEntries();
    const si = stored.findIndex(it => it.name === name && it.amount === amount && (it.displayDate === displayDate || it.isoDate === searchDate));
    if (si !== -1) { stored.splice(si, 1); saveExpenseEntries(stored); }
    renderExpenseList();

    // Sync chart data from storage after deletion
    syncExpenseChartDataWithStorage();

    // Close modal
    closeDeleteConfirmModal();
  }

  // Sync chart data with localStorage whenever it changes
  function syncExpenseChartDataWithStorage() {
    initializeExpenseDataFromStorage();
    const df = document.getElementById('dateFilter');
    const selectedDate = df && df.value ? df.value : null;
    if (selectedDate) {
      filterExpenseByDate(selectedDate);
    } else {
      // No date filter, show all data
      initializeExpenseData();
    }
    renderExpenseChart();
  }

  // Download
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      alert('Download functionality would export expense data here');
    });
  }

  // Close delete modal on bg click or Escape
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('deleteConfirmModal');
    if (event.target === modal) closeDeleteConfirmModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDeleteConfirmModal();
  });
});
