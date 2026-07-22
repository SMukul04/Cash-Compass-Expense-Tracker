document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('sidebarUserName');
  const greetEl = document.getElementById('greetingUserName');
  const logoutBtn = document.getElementById('logoutBtn');

  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');

  const displayName = (userName && userName.trim()) ? userName : (userEmail || 'User');

  if (nameEl) nameEl.textContent = displayName;
  if (greetEl) greetEl.textContent = displayName.split(' ')[0];

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

  // Storage keys
  const INCOME_STORAGE_KEY = 'incomeEntries';
  const EXPENSE_STORAGE_KEY = 'expenseEntries';
  const totalBalanceEl = document.getElementById('totalBalance');
  const totalIncomeEl = document.getElementById('totalIncome');
  const totalExpenseEl = document.getElementById('totalExpense');

  function loadEntries(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
  }

  function renderStats() {
    const incomes = loadEntries(INCOME_STORAGE_KEY);
    const expenses = loadEntries(EXPENSE_STORAGE_KEY);
    const totalIncome = incomes.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;
    if (totalIncomeEl) totalIncomeEl.textContent = formatINR(totalIncome);
    if (totalExpenseEl) totalExpenseEl.textContent = formatINR(totalExpense);
    if (totalBalanceEl) totalBalanceEl.textContent = formatINR(balance);

    // Also update Financial Overview donut when stats change
    renderOverviewDonut({ balance, totalIncome, totalExpense });
  }

  // Tooltip element (shared)
  let tooltipEl = document.getElementById('chartTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartTooltip';
    tooltipEl.className = 'chart-tooltip';
    document.body.appendChild(tooltipEl);
  }

  // Recent transactions with optional date range filter
  const txContainer = document.getElementById('recentTransactions');
  const txStartInput = document.getElementById('txStartDate');
  const txEndInput = document.getElementById('txEndDate');
  const txSelectedRange = document.getElementById('txSelectedRange');
  let txFilter = { start: null, end: null };

  function renderRecentTransactions() {
    if (!txContainer) return;
    txContainer.innerHTML = '';
    const incomes = loadEntries(INCOME_STORAGE_KEY).map(e => ({
      type: 'income',
      name: e.name,
      amount: Number(e.amount) || 0,
      icon: e.icon || '💼',
      iconCls: e.iconCls || 'gray',
      isoDate: e.isoDate || e.displayDate || ''
    }));
    const expenses = loadEntries(EXPENSE_STORAGE_KEY).map(e => ({
      type: 'expense',
      name: e.name,
      amount: Number(e.amount) || 0,
      icon: (function labelIcon(n){
        const map = { 'Shopping':'🛍️','Travel':'✈️','Electricity Bill':'💡','Loan Repayment':'🏦','Transport':'🚌','Bills':'🧾','Food':'🍔' };
        return e.icon || map[n] || '🏷️';
      })(e.name),
      iconCls: e.iconCls || 'gray',
      isoDate: e.isoDate || e.displayDate || ''
    }));
    const all = incomes.concat(expenses)
      .filter(t => t.isoDate)
      .filter(t => {
        if (!txFilter.start && !txFilter.end) return true;
        const d = new Date(t.isoDate);
        if (isNaN(d)) return false;
        if (txFilter.start && d < txFilter.start) return false;
        if (txFilter.end) {
          const endOfDay = new Date(txFilter.end);
          endOfDay.setHours(23,59,59,999);
          if (d > endOfDay) return false;
        }
        return true;
      })
      .sort((a,b) => String(b.isoDate).localeCompare(String(a.isoDate)))
      .slice(0,5);

    all.forEach(tx => {
      const row = document.createElement('div');
      row.className = 'transaction';
      const isNegative = tx.type === 'expense';
      const formatted = formatINR(Math.abs(tx.amount));
      row.innerHTML = `
        <div class="expense-left">
          <div class="expense-icon ${tx.iconCls}">${tx.icon}</div>
          <div>${tx.name}</div>
        </div>
        <div style="color:${isNegative?'#ef4444':'#16a34a'}">${isNegative?'-':'+'}${formatted}</div>
      `;
      txContainer.appendChild(row);
    });
  }

  // Transactions filter modal wiring
  const openTxFilterBtn = document.getElementById('openTxFilterBtn');
  const txFilterModal = document.getElementById('txFilterModal');
  const txCloseBtn = document.getElementById('txCloseBtn');
  const txApplyBtn = document.getElementById('txApplyBtn');
  const txClearBtn = document.getElementById('txClearBtn');

  function openTxModal() { if (txFilterModal) txFilterModal.style.display = 'grid'; }
  function closeTxModal() { if (txFilterModal) txFilterModal.style.display = 'none'; }

  if (openTxFilterBtn) openTxFilterBtn.addEventListener('click', openTxModal);
  if (txCloseBtn) txCloseBtn.addEventListener('click', closeTxModal);
  if (txFilterModal) window.addEventListener('click', (e) => { if (e.target === txFilterModal) closeTxModal(); });

  if (txApplyBtn) txApplyBtn.addEventListener('click', () => {
    const start = txStartInput && txStartInput.value ? new Date(txStartInput.value) : null;
    const end = txEndInput && txEndInput.value ? new Date(txEndInput.value) : null;
    txFilter = { start, end };
    if (txSelectedRange) {
      if (start || end) {
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const startText = start ? fmt(start) : '…';
        const endText = end ? fmt(end) : '…';
        txSelectedRange.textContent = `Showing: ${startText} to ${endText}`;
      } else {
        txSelectedRange.textContent = 'Showing: Latest';
      }
    }
    renderRecentTransactions();
    closeTxModal();
  });

  if (txClearBtn) txClearBtn.addEventListener('click', () => {
    txFilter = { start: null, end: null };
    if (txStartInput) txStartInput.value = '';
    if (txEndInput) txEndInput.value = '';
    if (txSelectedRange) txSelectedRange.textContent = 'Showing: Latest';
    renderRecentTransactions();
    closeTxModal();
  });

  // Expenses panel (latest few)
  const expensesList = document.getElementById('expensesList');
  function renderExpensesPanel() {
    if (!expensesList) return;
    expensesList.innerHTML = '';
    const expenses = loadEntries(EXPENSE_STORAGE_KEY)
      .sort((a,b) => String(b.isoDate).localeCompare(String(a.isoDate)))
      .slice(0,4);
    expenses.forEach(e => {
      const row = document.createElement('div');
      row.className = 'expense-item';
      const icon = e.icon || '🏷️';
      const iconCls = e.iconCls || 'gray';
      row.innerHTML = `
        <div class="expense-left">
          <div class="expense-icon ${iconCls}">${icon}</div>
          <div>
            <div>${e.name}</div>
            <div class="expense-meta">${e.displayDate}</div>
          </div>
        </div>
        <div class="expense-amount">-${formatINR(Math.abs(e.amount))}</div>
      `;
      expensesList.appendChild(row);
    });
  }

  // Simple bar chart for last 30 days expenses
  const barChart = document.getElementById('expensesChart');
  const chartLabels = document.getElementById('expensesLabels');
  function renderExpenseBarChart() {
    if (!barChart || !chartLabels) return;
    barChart.innerHTML = '';
    chartLabels.innerHTML = '';

    // Aggregate expenses by category from storage
    const expenses = loadEntries(EXPENSE_STORAGE_KEY);
    const map = new Map();
    expenses.forEach(e => { map.set(e.name, (map.get(e.name) || 0) + (Number(e.amount)||0)); });
    const data = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    if (!data.length) return;

    const max = Math.max(...data.map(d => d.value));
    const yMax = Math.ceil(max / 100) * 100;

    data.forEach((item, i) => {
      const height = yMax > 0 ? (item.value / yMax) * 240 : 0;
      const bar = document.createElement('div');
      bar.className = 'bar' + (i % 2 ? ' light' : '');
      bar.style.height = Math.min(240, height) + 'px';
      bar.title = `${item.label}: ${formatINR(item.value)}`;
      bar.addEventListener('mousemove', (ev) => {
        tooltipEl.textContent = `${item.label}: ${formatINR(item.value)}`;
        tooltipEl.style.left = ev.pageX + 'px';
        tooltipEl.style.top = ev.pageY + 'px';
        tooltipEl.style.opacity = '1';
      });
      bar.addEventListener('mouseleave', () => { tooltipEl.style.opacity = '0'; });
      barChart.appendChild(bar);

      const label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = item.label;
      chartLabels.appendChild(label);
    });
  }

  // Income panel (latest few)
  const incomeList = document.getElementById('incomeList');
  function renderIncomePanel() {
    if (!incomeList) return;
    incomeList.innerHTML = '';
    const incomes = loadEntries(INCOME_STORAGE_KEY)
      .sort((a,b) => String(b.isoDate).localeCompare(String(a.isoDate)))
      .slice(0,5);
    incomes.forEach(i => {
      const icon = i.icon || '💼';
      const iconCls = i.iconCls || 'gray';
      const row = document.createElement('div');
      row.className = 'expense-item';
      row.innerHTML = `
        <div class="expense-left">
          <div class="expense-icon ${iconCls}">${icon}</div>
          <div>
            <div>${i.name}</div>
            <div class="expense-meta">${i.displayDate}</div>
          </div>
        </div>
        <div class="income-amount">+${formatINR(i.amount)}</div>
      `;
      incomeList.appendChild(row);
    });
  }

  // Simple donut chart for last 30 days income
  const incomeDonutSvg = document.getElementById('incomeDonutSvg');
  function renderIncomeDonut() {
    if (!incomeDonutSvg) return;
    incomeDonutSvg.innerHTML = '';
    const incomes = loadEntries(INCOME_STORAGE_KEY).filter(i => {
      const iso = i.isoDate || i.displayDate || '';
      if (!iso) return false;
      const d = new Date(iso);
      if (isNaN(d)) return false;
      const now = new Date();
      const diffDays = (now - d) / (1000*60*60*24);
      return diffDays <= 30 && diffDays >= 0;
    });
    const colorPalette = ['#6d28d9','#ef4444','#f97316','#3b82f6','#10b981','#f59e0b'];
    const map = new Map();
    incomes.forEach(i => { map.set(i.name, (map.get(i.name)||0) + (Number(i.amount)||0)); });
    const categories = Array.from(map.entries()).map(([label, value], idx) => ({ label, value, color: colorPalette[idx % colorPalette.length] }));
    const total = categories.reduce((s,c)=>s+c.value,0) || 1;
    const totalEl = document.getElementById('incomeTotal');
    if (totalEl) totalEl.textContent = formatINR(total);
    const incomeLabelEl = document.querySelector('#incomeDonut .donut-label');

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    categories.forEach(cat => {
      const fraction = cat.value / total;
      const dash = fraction * circumference;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', String(radius));
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', cat.color);
      circle.setAttribute('stroke-width', '24');
      circle.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
      circle.setAttribute('stroke-dashoffset', String(-offset));
      circle.setAttribute('transform', 'rotate(-90 100 100)');
      circle.style.transition = 'transform 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease';
      circle.addEventListener('mousemove', (ev) => {
        tooltipEl.textContent = `${cat.label}: ${formatINR(cat.value)}`;
        tooltipEl.style.left = ev.pageX + 'px';
        tooltipEl.style.top = ev.pageY + 'px';
        tooltipEl.style.opacity = '1';
        circle.style.filter = 'brightness(1.15)';
        circle.setAttribute('stroke-width', '26');
        if (totalEl) totalEl.textContent = formatINR(cat.value);
        if (incomeLabelEl) incomeLabelEl.textContent = cat.label;
      });
      circle.addEventListener('mouseleave', () => {
        tooltipEl.style.opacity = '0';
        circle.style.filter = 'none';
        circle.setAttribute('stroke-width', '24');
        if (totalEl) totalEl.textContent = formatINR(total);
        if (incomeLabelEl) incomeLabelEl.textContent = 'Total Income';
      });
      incomeDonutSvg.appendChild(circle);
      offset += dash;
    });

    const legend = document.getElementById('incomeLegend');
    if (legend) {
      legend.innerHTML = '';
      categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background:${cat.color}"></span>${cat.label}`;
        legend.appendChild(item);
      });
    }
  }

  // Financial Overview donut (Income and Expenses only)
  const overviewSvg = document.getElementById('overviewDonut');
  function renderOverviewDonut({ balance, totalIncome, totalExpense } = {}) {
    if (!overviewSvg) return;
    overviewSvg.innerHTML = '';
    const incomes = loadEntries(INCOME_STORAGE_KEY);
    const expenses = loadEntries(EXPENSE_STORAGE_KEY);
    const income = totalIncome != null ? totalIncome : incomes.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const expense = totalExpense != null ? totalExpense : expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);

    // Only show Income and Expense segments
    const segments = [
      { key: 'Income', value: Math.max(income, 0), color: '#f97316' },
      { key: 'Expenses', value: Math.max(expense, 0), color: '#ef4444' }
    ];
    const total = segments.reduce((s,x)=>s+x.value,0) || 1;

    const totalEl = document.getElementById('overviewTotal');
    const labelEl = document.querySelector('#chart .donut-label');
    if (totalEl) {
      // Show total (income + expense) or just display income vs expense comparison
      totalEl.textContent = formatINR(total);
    }
    if (labelEl) {
      labelEl.textContent = 'Total';
    }

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    segments.forEach(seg => {
      const fraction = seg.value / total;
      const dash = fraction * circumference;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', String(radius));
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', seg.color);
      circle.setAttribute('stroke-width', '24');
      circle.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
      circle.setAttribute('stroke-dashoffset', String(-offset));
      circle.setAttribute('transform', 'rotate(-90 100 100)');
      circle.style.transition = 'transform 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease';
      circle.addEventListener('mousemove', (ev) => {
        tooltipEl.textContent = `${seg.key}: ${formatINR(seg.value)}`;
        tooltipEl.style.left = ev.pageX + 'px';
        tooltipEl.style.top = ev.pageY + 'px';
        tooltipEl.style.opacity = '1';
        circle.style.filter = 'brightness(1.15)';
        circle.setAttribute('stroke-width', '26');
        if (totalEl) totalEl.textContent = formatINR(seg.value);
        if (labelEl) labelEl.textContent = seg.key;
      });
      circle.addEventListener('mouseleave', () => {
        tooltipEl.style.opacity = '0';
        circle.style.filter = 'none';
        circle.setAttribute('stroke-width', '24');
        if (totalEl) totalEl.textContent = formatINR(total);
        if (labelEl) labelEl.textContent = 'Total';
      });
      overviewSvg.appendChild(circle);
      offset += dash;
    });

    const legend = document.getElementById('overviewLegend');
    if (legend) {
      legend.innerHTML = '';
      segments.forEach(seg => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background:${seg.color}"></span>${seg.key}`;
        legend.appendChild(item);
      });
    }
  }
  // Initial renders
  renderStats();
  renderRecentTransactions();
  renderExpensesPanel();
  renderIncomePanel();
  renderExpenseBarChart();
  renderIncomeDonut();
});
