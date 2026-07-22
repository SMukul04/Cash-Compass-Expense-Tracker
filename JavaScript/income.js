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

  // INR currency formatter
  const formatINR = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  // Income chart data - now shows categories
  const incomeChart = document.getElementById('incomeChart');
  const chartLabels = document.getElementById('incomeChartLabels');
  // Shared tooltip element
  let tooltipEl = document.getElementById('chartTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartTooltip';
    tooltipEl.className = 'chart-tooltip';
    document.body.appendChild(tooltipEl);
  }
  
  // Track income data for dynamic updates - loaded from localStorage
  let allIncomeData = [];

  // Current filtered data for chart display
  let currentIncomeData = {};

  // Initialize income data from localStorage
  function initializeIncomeDataFromStorage() {
    const entries = loadIncomeEntries();
    allIncomeData = entries
      .filter(entry => entry && entry.name && entry.amount) // Only include valid entries
      .map(entry => ({
        source: entry.name,
        amount: Number(entry.amount) || 0,
        date: entry.isoDate || entry.displayDate || ''
      }));
    console.log('Loaded income data from storage:', allIncomeData.length, 'entries');
    console.log('All income entries:', allIncomeData);
  }

  // Initialize with data (group by category for initial display)
  function initializeIncomeData() {
    // Group by category for initial display (all dates)
    currentIncomeData = {};
    allIncomeData.forEach(item => {
      if (!item.source || !item.amount) return; // Skip invalid items
      if (currentIncomeData[item.source]) {
        currentIncomeData[item.source] += item.amount;
      } else {
        currentIncomeData[item.source] = item.amount;
      }
    });
    console.log('Grouped income data by category:', currentIncomeData);
  }

  // Filter income data by selected date
  function filterIncomeByDate(selectedDate) {
    console.log('Filtering by date:', selectedDate);
    console.log('Available dates:', allIncomeData.map(item => item.date));
    
    if (!selectedDate) {
      // Show all data if no date selected
      initializeIncomeData();
      return;
    }

    currentIncomeData = {};
    const filteredData = allIncomeData.filter(item => item.date === selectedDate);
    console.log('Filtered data for', selectedDate, ':', filteredData);
    
    filteredData.forEach(item => {
      if (currentIncomeData[item.source]) {
        currentIncomeData[item.source] += item.amount;
      } else {
        currentIncomeData[item.source] = item.amount;
      }
    });
    
    console.log('Current income data after filtering:', currentIncomeData);
  }

  function renderIncomeChart() {
    if (incomeChart && chartLabels) {
      // Clear existing chart
      incomeChart.innerHTML = '';
      chartLabels.innerHTML = '';

      const categories = Object.keys(currentIncomeData);
      const values = Object.values(currentIncomeData);
      
      if (categories.length === 0 || values.length === 0) {
        // Show message when no data for selected date
        const noDataMsg = document.createElement('div');
        noDataMsg.style.textAlign = 'center';
        noDataMsg.style.color = '#666';
        noDataMsg.style.padding = '40px';
        noDataMsg.textContent = 'No income data for selected date';
        incomeChart.appendChild(noDataMsg);
        return;
      }
      
      const maxAmount = Math.max(...values);
      
      categories.forEach((category, i) => {
        const amount = currentIncomeData[category];
        const height = maxAmount > 0 ? (amount / maxAmount) * 280 : 0;
        
        const bar = document.createElement('div');
        bar.className = 'income-bar' + (i % 2 ? ' light' : '');
        bar.style.height = Math.min(280, height) + 'px';
      bar.title = `${category}: ${formatINR(amount)}`;
      bar.addEventListener('mousemove', (ev) => {
        tooltipEl.textContent = `${category}: ${formatINR(amount)}`;
        tooltipEl.style.left = ev.pageX + 'px';
        tooltipEl.style.top = ev.pageY + 'px';
        tooltipEl.style.opacity = '1';
      });
      bar.addEventListener('mouseleave', () => { tooltipEl.style.opacity = '0'; });
        incomeChart.appendChild(bar);
        
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.textContent = category;
        chartLabels.appendChild(label);
      });
    }
  }

  // Date filter functionality - check if there's a date set, otherwise show all data
  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    // Handle date filter changes
    dateFilter.addEventListener('change', function() {
      const selectedDate = this.value;
      filterIncomeByDate(selectedDate);
      renderIncomeChart();
    });
  }
  
  // Note: Chart will be initialized after income list data is loaded (see below)

  // Income sources list
  const sourcesList = document.getElementById('incomeSourcesList');
  const incomeCategoryFilter = document.getElementById('incomeCategoryFilter');

  // List data store for UI (separate from chart store)
  const incomeListData = [];

  // Persistence helpers
  const INCOME_STORAGE_KEY = 'incomeEntries';
  function loadIncomeEntries() {
    try {
      const raw = localStorage.getItem(INCOME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function saveIncomeEntries(entries) {
    try { localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(entries)); } catch (_) {}
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

  function renderIncomeList() {
    if (!sourcesList) return;
    sourcesList.innerHTML = '';
    const selected = incomeCategoryFilter ? incomeCategoryFilter.value : 'All';

    // Filter and sort by isoDate desc
    const items = incomeListData
      .filter(i => selected === 'All' || i.name === selected)
      .sort((a, b) => (b.isoDate || '') .localeCompare(a.isoDate || ''));

    items.forEach(source => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.innerHTML = `
        <div class="source-left">
          <div class="source-icon ${source.iconCls}">${source.icon}</div>
          <div class="source-info">
            <h3>${source.name}</h3>
            <div class="source-date">${source.displayDate}</div>
          </div>
        </div>
        <div class="source-amount">
          +${formatINR(source.amount)}
          <span class="trend-icon">📈</span>
        </div>
        <div class="edit-icon" data-source="${source.name}" data-amount="${source.amount}" data-date="${source.displayDate}" title="Edit income">✎</div>
        <div class="delete-icon" data-source="${source.name}" data-amount="${source.amount}" data-date="${source.displayDate}" title="Delete income">×</div>
      `;
      sourcesList.appendChild(item);

      const deleteButton = item.querySelector('.delete-icon');
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const s = this.getAttribute('data-source');
        const a = parseFloat(this.getAttribute('data-amount'));
        const d = this.getAttribute('data-date');
        deleteIncomeItem(this, s, a, d);
      });

      const editButton = item.querySelector('.edit-icon');
      if (editButton) {
        editButton.addEventListener('click', function(e) {
          e.stopPropagation();
          const s = this.getAttribute('data-source');
          const a = parseFloat(this.getAttribute('data-amount'));
          const d = this.getAttribute('data-date');
          openEditIncomeModal({ name: s, amount: a, displayDate: d });
        });
      }
    });
  }

  if (sourcesList) {
    const sources = [
      { icon: '💼', iconCls: 'purple', name: 'Salary', date: '9th Oct 2025', amount: 4500 },
      { icon: '🛒', iconCls: 'pink', name: 'E-commerce Sales', date: '9th Oct 2025', amount: 3200 },
      { icon: '🎨', iconCls: 'yellow', name: 'Graphic Design', date: '10th Oct 2025', amount: 2800 },
      { icon: '🤝', iconCls: 'gray', name: 'Affiliate Marketing', date: '11th Oct 2025', amount: 1500 },
      { icon: '🏦', iconCls: 'blue', name: 'Interest from Savings', date: '13th Jan 2025', amount: 9600 }
    ];
    // Load from storage or seed defaults
    let stored = loadIncomeEntries();
    if (!stored.length) {
      stored = sources.map(s => ({
        type: 'income',
        name: s.name,
        amount: s.amount,
        displayDate: s.date,
        isoDate: parseDisplayDateToISO(s.date),
        icon: s.icon,
        iconCls: s.iconCls
      }));
      saveIncomeEntries(stored);
    }
    stored.forEach(s => incomeListData.push(s));
    renderIncomeList();
    
    // Re-initialize chart data after all list data is loaded
    initializeIncomeDataFromStorage();
    initializeIncomeData();
    renderIncomeChart();
  }

  // Edit income
  const editIncomeModal = document.getElementById('editIncomeModal');
  const editIncomeForm = document.getElementById('editIncomeForm');
  const editIncomeClose = document.getElementById('editIncomeClose');
  const editIncomeCancel = document.getElementById('editIncomeCancel');
  const editIncomeSource = document.getElementById('editIncomeSource');
  const editIncomeAmount = document.getElementById('editIncomeAmount');
  const editIncomeDate = document.getElementById('editIncomeDate');
  let incomeEditOriginal = null;

  function openEditIncomeModal(entry) {
    incomeEditOriginal = entry;
    if (editIncomeSource) editIncomeSource.value = entry.name;
    if (editIncomeAmount) editIncomeAmount.value = entry.amount;
    if (editIncomeDate) {
      // convert display date to iso for input
      const iso = (function(d){
        const m = d.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)/);
        if (!m) return d;
        const day = m[1];
        const month = m[2];
        const year = m[3];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const idx = months.indexOf(month);
        if (idx === -1) return d;
        return `${year}-${String(idx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      })(entry.displayDate);
      editIncomeDate.value = iso;
    }
    if (editIncomeModal) editIncomeModal.style.display = 'block';
  }

  function closeEditIncomeModal() { if (editIncomeModal) editIncomeModal.style.display = 'none'; incomeEditOriginal = null; }
  if (editIncomeClose) editIncomeClose.addEventListener('click', closeEditIncomeModal);
  if (editIncomeCancel) editIncomeCancel.addEventListener('click', closeEditIncomeModal);
  window.addEventListener('click', (e) => { if (e.target === editIncomeModal) closeEditIncomeModal(); });

  if (editIncomeForm) {
    editIncomeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!incomeEditOriginal) return closeEditIncomeModal();
      const form = new FormData(editIncomeForm);
      const newName = form.get('source');
      const newAmount = parseFloat(form.get('amount'));
      const newDate = form.get('date');
      // update list data
      const idx = incomeListData.findIndex(it => it.name === incomeEditOriginal.name && it.amount === incomeEditOriginal.amount && it.displayDate === incomeEditOriginal.displayDate);
      if (idx !== -1) {
        incomeListData[idx].name = newName;
        incomeListData[idx].amount = newAmount;
        incomeListData[idx].displayDate = formatDate(newDate);
        incomeListData[idx].isoDate = newDate;
        incomeListData[idx].icon = getIconForSource(newName);
        incomeListData[idx].iconCls = getIconClassForSource(newName);
      }
      // persist
      const stored = loadIncomeEntries();
      const si = stored.findIndex(it => it.name === incomeEditOriginal.name && it.amount === incomeEditOriginal.amount && it.displayDate === incomeEditOriginal.displayDate);
      if (si !== -1) {
        stored[si] = { ...stored[si], name: newName, amount: newAmount, displayDate: formatDate(newDate), isoDate: newDate, icon: getIconForSource(newName), iconCls: getIconClassForSource(newName) };
        saveIncomeEntries(stored);
      }
      // Sync chart data from storage (more reliable than trying to update individual items)
      syncChartDataWithStorage();
      // re-render list
      renderIncomeList();
      closeEditIncomeModal();
    });
  }

  if (incomeCategoryFilter) {
    incomeCategoryFilter.addEventListener('change', () => {
      renderIncomeList();
    });
  }

  // Add Income button functionality
  const addIncomeBtn = document.querySelector('.add-income-btn');
  const modal = document.getElementById('addIncomeModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.querySelector('.btn-cancel');
  const addIncomeForm = document.getElementById('addIncomeForm');

  if (addIncomeBtn) {
    addIncomeBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });
  }

  // Modal event handlers
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  }
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // Form submission
  if (addIncomeForm) {
    addIncomeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(addIncomeForm);
      const source = formData.get('source');
      const amount = parseFloat(formData.get('amount'));
      const date = formData.get('date'); // ISO: YYYY-MM-DD

      if (source && amount && date) {
        // Add new income source to the list
        addNewIncomeSource({
          name: source,
          amount: amount,
          displayDate: formatDate(date),
          isoDate: date,
          icon: getIconForSource(source),
          iconCls: getIconClassForSource(source)
        });

        // Close modal and reset form
        modal.style.display = 'none';
        addIncomeForm.reset();
      }
    });
  }

  // Helper functions
  function getIconForSource(source) {
    const iconMap = {
      'Salary': '💼',
      'Interest from Savings': '🏦',
      'E-commerce Sales': '🛒',
      'Graphic Design': '🎨',
      'Affiliate Marketing': '🤝'
    };
    return iconMap[source] || '💰';
  }

  function getIconClassForSource(source) {
    const classMap = {
      'Salary': 'gray',
      'Interest from Savings': 'blue',
      'E-commerce Sales': 'pink',
      'Graphic Design': 'yellow',
      'Affiliate Marketing': 'gray'
    };
    return classMap[source] || 'gray';
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

  function addNewIncomeSource(sourceData) {
    const sourcesList = document.getElementById('incomeSourcesList');
    if (sourcesList) {
      // push to list data and re-render
      const entry = {
        name: sourceData.name,
        amount: sourceData.amount,
        displayDate: sourceData.displayDate,
        isoDate: sourceData.isoDate,
        icon: sourceData.icon,
        iconCls: sourceData.iconCls,
        type: 'income'
      };
      incomeListData.unshift(entry);
      // persist
      const stored = loadIncomeEntries();
      stored.push(entry);
      saveIncomeEntries(stored);
      renderIncomeList();
    }

    // Re-initialize from storage to get all entries (including the new one)
    initializeIncomeDataFromStorage();
    
    // Update chart based on current filter
    const dateFilter = document.getElementById('dateFilter');
    const selectedDate = dateFilter && dateFilter.value ? dateFilter.value : null;
    if (selectedDate) {
      filterIncomeByDate(selectedDate);
    } else {
      // No date filter, show all data grouped by category
      initializeIncomeData();
    }
    renderIncomeChart();
  }

  // Sync chart data with localStorage whenever it changes
  function syncChartDataWithStorage() {
    initializeIncomeDataFromStorage();
    const dateFilter = document.getElementById('dateFilter');
    const selectedDate = dateFilter && dateFilter.value ? dateFilter.value : null;
    if (selectedDate) {
      filterIncomeByDate(selectedDate);
    } else {
      // No date filter, show all data
      initializeIncomeData();
    }
    renderIncomeChart();
  }

  // Global variables for delete confirmation
  let currentDeleteData = null;

  // Delete income item function
  function deleteIncomeItem(deleteButton, name, amount, displayDate) {
    console.log('🗑️ Delete function called with:', { name, amount, displayDate });
    
    // Store the delete data globally
    currentDeleteData = {
      deleteButton,
      name,
      amount,
      displayDate
    };
    
    // Show custom confirmation modal
    showDeleteConfirmModal(name, amount, displayDate);
  }

  // Show delete confirmation modal
  function showDeleteConfirmModal(name, amount, displayDate) {
    const modal = document.getElementById('deleteConfirmModal');
    const sourceElement = document.getElementById('deleteSource');
    const amountElement = document.getElementById('deleteAmount');
    const dateElement = document.getElementById('deleteDate');
    
    if (modal && sourceElement && amountElement && dateElement) {
      // Populate modal with data
      sourceElement.textContent = name;
      amountElement.textContent = formatINR(amount);
      dateElement.textContent = displayDate;
      
      // Show modal
      modal.style.display = 'block';
      
      // Add event listener to confirm button
      const confirmButton = document.getElementById('confirmDeleteButton');
      if (confirmButton) {
        confirmButton.onclick = function() {
          confirmDelete();
        };
      }
    }
  }

  // Close delete confirmation modal
  function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.style.display = 'none';
      currentDeleteData = null;
    }
  }

  // Confirm delete action
  function confirmDelete() {
    if (!currentDeleteData) return;
    
    const { deleteButton, name, amount, displayDate } = currentDeleteData;
    
    // Find the parent source item
    const sourceItem = deleteButton.closest('.source-item');
    
    // Convert display date back to YYYY-MM-DD format for matching
    let searchDate = displayDate;
    try {
      // Try to parse the display date (e.g., "11th Oct 2025")
      const dateMatch = displayDate.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)/);
      if (dateMatch) {
        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        
        // Convert month name to number
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);
        
        if (monthIndex !== -1) {
          searchDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.warn('Could not parse date:', displayDate);
    }
    
    console.log('Searching for date:', searchDate);
    console.log('Available dates in allIncomeData:', allIncomeData.map(item => item.date));
    
    // Sync chart data from storage after deletion (more reliable)
    syncChartDataWithStorage();
    
    // Remove from list data and DOM
    const isoFromDisplay = (function(d){
      const m = d.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)/);
      if (!m) return d;
      const day = m[1];
      const month = m[2];
      const year = m[3];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const idx = months.indexOf(month);
      if (idx === -1) return d;
      return `${year}-${String(idx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    })(displayDate);

    if (Array.isArray(incomeListData)) {
      const li = incomeListData.findIndex(it => it.name === name && it.amount === amount && (it.isoDate === isoFromDisplay || it.displayDate === displayDate));
      if (li !== -1) incomeListData.splice(li, 1);
      // persist removal
      const stored = loadIncomeEntries();
      const si = stored.findIndex(it => it.name === name && it.amount === amount && (it.isoDate === isoFromDisplay || it.displayDate === displayDate));
      if (si !== -1) { stored.splice(si, 1); saveIncomeEntries(stored); }
      renderIncomeList();
    }

    if (sourceItem) {
      sourceItem.style.transition = 'all 0.3s ease';
      sourceItem.style.opacity = '0';
      sourceItem.style.transform = 'translateX(100%)';
      setTimeout(() => { sourceItem.remove(); }, 300);
    }
    
    // Remove from incomeListData and re-render
    const listItemIndex = incomeListData.findIndex(item => 
      item.name === name && item.amount === amount && item.displayDate === displayDate
    );
    if (listItemIndex !== -1) {
      incomeListData.splice(listItemIndex, 1);
      renderIncomeList();
    }

    // Close modal
    closeDeleteConfirmModal();
  }

  // Download button functionality
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      alert('Download functionality would export income data here');
    });
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('deleteConfirmModal');
    if (event.target === modal) {
      closeDeleteConfirmModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeDeleteConfirmModal();
    }
  });
});
