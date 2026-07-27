/**
 * TrackPulse Main Application Logic - Multi-User & Secure Auth Edition
 */

class TrackPulseApp {
  constructor() {
    this.currentMonday = new Date();
    const day = (this.currentMonday.getDay() + 6) % 7;
    this.currentMonday.setDate(this.currentMonday.getDate() - day);
    this.currentMonday.setHours(0, 0, 0, 0);

    this.activeTab = 'weekly-view';
    this.isRendering = false;
    this.isRegisterMode = false;

    this.init();
  }

  init() {
    StorageManager.initUserSession();

    // Ensure no automatic admin login on initial site load
    const habits = StorageManager.getHabits();
    if (!habits || habits.length === 0) {
      StorageManager.seedDemoData(this.currentMonday);
    }

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    document.getElementById('prev-week-btn').addEventListener('click', () => this.changeWeek(-7));
    document.getElementById('next-week-btn').addEventListener('click', () => this.changeWeek(7));
    document.getElementById('today-week-btn').addEventListener('click', () => this.goToTodayWeek());

    // Desktop & Mobile Tab Navigation
    document.querySelectorAll('.tab-btn, .mobile-bottom-nav .nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        if (targetTab) this.switchTab(targetTab);
      });
    });

    // Mobile FAB Buttons
    const fabLogBtn = document.getElementById('mobile-fab-log-btn');
    if (fabLogBtn) fabLogBtn.addEventListener('click', () => this.openLogModal());

    const mobileAddBtn = document.getElementById('mobile-add-activity-btn');
    if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => this.openHabitModal());

    // Auth Events
    document.getElementById('user-auth-btn').addEventListener('click', () => this.openAuthModal());
    document.getElementById('close-auth-modal').addEventListener('click', () => this.closeAuthModal());
    document.getElementById('toggle-auth-mode-btn').addEventListener('click', () => this.toggleAuthMode());
    document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuthSubmit(e));

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        StorageManager.logout();
        this.showToast('Signed out successfully.', 'info');
        this.render();
      });
    }

    // Refresh Admin Stats
    const refreshAdminBtn = document.getElementById('refresh-admin-btn');
    if (refreshAdminBtn) {
      refreshAdminBtn.addEventListener('click', () => this.renderAdminPanel());
    }

    // Modals
    document.getElementById('open-add-habit-modal-btn').addEventListener('click', () => this.openHabitModal());
    document.getElementById('matrix-add-btn').addEventListener('click', () => this.openHabitModal());
    document.getElementById('close-habit-modal').addEventListener('click', () => this.closeHabitModal());
    document.getElementById('cancel-habit-modal').addEventListener('click', () => this.closeHabitModal());
    document.getElementById('habit-form').addEventListener('submit', (e) => this.handleSaveHabit(e));

    document.getElementById('habit-metric-type').addEventListener('change', (e) => this.updateGoalUnitLabel(e.target.value));

    document.getElementById('open-log-modal-btn').addEventListener('click', () => this.openLogModal());
    document.getElementById('close-log-modal').addEventListener('click', () => this.closeLogModal());
    document.getElementById('cancel-log-modal').addEventListener('click', () => this.closeLogModal());
    document.getElementById('log-form').addEventListener('submit', (e) => this.handleSaveLog(e));

    document.getElementById('log-habit-select').addEventListener('change', (e) => this.updateLogValueInputLabel(e.target.value));

    // Options Menu
    const menuBtn = document.getElementById('settings-menu-btn');
    const dropdown = document.getElementById('settings-dropdown');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', () => dropdown && dropdown.classList.add('hidden'));

    document.getElementById('load-demo-btn').addEventListener('click', () => {
      StorageManager.seedDemoData(this.currentMonday);
      this.showToast('Demo data loaded successfully!', 'success');
      this.render();
    });

    document.getElementById('export-data-btn').addEventListener('click', () => {
      StorageManager.exportJSON();
      this.showToast('Data exported as JSON file.', 'info');
    });

    const importInput = document.getElementById('import-file-input');
    document.getElementById('import-data-btn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const ok = StorageManager.importJSON(event.target.result);
          if (ok) {
            this.showToast('Data imported successfully!', 'success');
            this.render();
          } else {
            this.showToast('Invalid JSON import file.', 'danger');
          }
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all activities and logs?')) {
        StorageManager.clearAll();
        StorageManager.saveHabits([]);
        this.showToast('All data cleared.', 'info');
        this.render();
      }
    });

    const chartModeSelect = document.getElementById('activity-chart-mode');
    if (chartModeSelect) {
      chartModeSelect.addEventListener('change', () => this.renderCharts());
    }

    document.getElementById('save-reflection-btn').addEventListener('click', () => this.saveReflection());
  }

  changeWeek(daysOffset) {
    this.currentMonday.setDate(this.currentMonday.getDate() + daysOffset);
    this.render();
  }

  goToTodayWeek() {
    this.currentMonday = new Date();
    const day = (this.currentMonday.getDay() + 6) % 7;
    this.currentMonday.setDate(this.currentMonday.getDate() - day);
    this.currentMonday.setHours(0, 0, 0, 0);
    this.render();
  }

  switchTab(tabId) {
    if (this.activeTab === tabId) return;
    this.activeTab = tabId;

    document.querySelectorAll('.tab-btn, .mobile-bottom-nav .nav-item[data-tab]').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isTarget);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    if (tabId === 'graphs-view') {
      requestAnimationFrame(() => this.renderCharts());
    } else if (tabId === 'admin-view') {
      this.renderAdminPanel();
    }
  }

  // Auth Handlers
  openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
  }

  closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  toggleAuthMode() {
    this.isRegisterMode = !this.isRegisterMode;
    const titleEl = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleBtn = document.getElementById('toggle-auth-mode-btn');

    if (this.isRegisterMode) {
      titleEl.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create New Account';
      submitBtn.textContent = 'Register Account';
      toggleBtn.textContent = 'Already registered? Sign In';
    } else {
      titleEl.innerHTML = '<i class="fa-solid fa-user-lock"></i> Account Sign In';
      submitBtn.textContent = 'Sign In';
      toggleBtn.textContent = 'Need an account? Register';
    }
  }

  async handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    let res;
    if (this.isRegisterMode) {
      res = await StorageManager.register(username, password);
    } else {
      res = await StorageManager.login(username, password);
    }

    if (res.success) {
      this.closeAuthModal();
      this.showToast(`Welcome back, ${res.user.username}!`, 'success');
      this.render();
    } else {
      this.showToast(res.error || 'Authentication error', 'danger');
    }
  }

  renderUserBadge() {
    const user = StorageManager.currentUser;
    const badgeLabel = document.getElementById('user-badge-label');
    const logoutBtn = document.getElementById('logout-btn');
    const adminTabs = document.querySelectorAll('.admin-only-tab');

    if (user) {
      const isAdmin = user.role === 'admin' || user.username.toUpperCase() === 'RIADH';
      badgeLabel.innerHTML = isAdmin ? `👑 <strong>${user.username}</strong>` : `👤 <strong>${user.username}</strong>`;
      if (logoutBtn) logoutBtn.classList.remove('hidden');

      adminTabs.forEach(el => {
        if (isAdmin) el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
    } else {
      badgeLabel.textContent = 'Login';
      if (logoutBtn) logoutBtn.classList.add('hidden');
      adminTabs.forEach(el => el.classList.add('hidden'));

      // If viewing admin tab while logged out, switch to main tab
      if (this.activeTab === 'admin-view') {
        this.switchTab('weekly-view');
      }
    }
  }

  async renderAdminPanel() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const user = StorageManager.currentUser;
    if (!user || (user.role !== 'admin' && user.username.toUpperCase() !== 'RIADH')) {
      tbody.innerHTML = '<tr><td colspan="5">Access denied. Please log in as Admin RIADH.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="5">Loading registered members...</td></tr>';
    const overview = await StorageManager.fetchAdminOverview();

    if (!overview || !overview.users) {
      tbody.innerHTML = '<tr><td colspan="5">Offline mode or admin access unavailable. Run server via node server.js.</td></tr>';
      return;
    }

    tbody.innerHTML = overview.users.map(u => `
      <tr>
        <td><strong>${this.escapeHTML(u.username)}</strong> ${u.role === 'admin' ? '<span class="streak-pill">👑 Admin</span>' : ''}</td>
        <td><span class="stat-badge">${u.role}</span></td>
        <td>${u.habitsCount} goals</td>
        <td>${u.logsCount} entries logged</td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
      </tr>
    `).join('');
  }

  render() {
    if (this.isRendering) return;
    this.isRendering = true;

    requestAnimationFrame(() => {
      this.renderUserBadge();

      const weekDetails = StorageManager.getWeekDetails(this.currentMonday);
      
      const startStr = `${weekDetails.monday.getDate()} ${StorageManager.formatDayHeader(weekDetails.monday).monthName}`;
      const endStr = `${weekDetails.sunday.getDate()} ${StorageManager.formatDayHeader(weekDetails.sunday).monthName}`;
      document.getElementById('current-week-label').textContent = `${startStr} - ${endStr}`;

      const dayIds = ['th-mon', 'th-tue', 'th-wed', 'th-thu', 'th-fri', 'th-sat', 'th-sun'];
      weekDetails.days.forEach((d, idx) => {
        const headerInfo = StorageManager.formatDayHeader(d);
        const thEl = document.getElementById(dayIds[idx]);
        if (thEl) {
          thEl.innerHTML = `${headerInfo.dayName}<br><span style="font-size:0.72rem; font-weight:normal; opacity:0.7;">${headerInfo.dayNum} ${headerInfo.monthName}</span>`;
        }
      });

      const habits = StorageManager.getHabits();
      const logs = StorageManager.getLogs();

      this.renderHabitMatrix(weekDetails, habits, logs);
      this.renderKPICards(weekDetails, habits, logs);
      this.loadReflection(weekDetails.weekKey);

      if (this.activeTab === 'graphs-view') {
        this.renderCharts();
      } else if (this.activeTab === 'admin-view') {
        this.renderAdminPanel();
      }

      this.isRendering = false;
    });
  }

  renderHabitMatrix(weekDetails, habits, logs) {
    const tbody = document.getElementById('habit-matrix-tbody');
    const emptyState = document.getElementById('empty-habits-state');
    const table = document.getElementById('habit-table');

    if (!habits || habits.length === 0) {
      table.style.display = 'none';
      emptyState.classList.remove('hidden');
      tbody.innerHTML = '';
      return;
    }

    table.style.display = 'table';
    emptyState.classList.add('hidden');

    const dayStrs = weekDetails.days.map(d => StorageManager.formatDateISO(d));
    const fragment = document.createDocumentFragment();

    habits.forEach(habit => {
      const tr = document.createElement('tr');

      let weekTotal = 0;
      dayStrs.forEach(d => {
        const log = logs[`${habit.id}_${d}`];
        if (log) {
          if (habit.metricType === 'checkbox') {
            weekTotal += Number(log.value) > 0 ? 1 : 0;
          } else {
            weekTotal += Number(log.value) || 0;
          }
        }
      });

      const goalVal = Number(habit.goalValue) || 1;
      const progressRatio = Math.min(1, Math.max(0, weekTotal / goalVal));
      const progressPercent = Math.min(100, Math.round(progressRatio * 100));

      const streak = this.calculateStreak(habit.id, logs);

      let activityHTML = `
        <td class="col-activity sticky-col">
          <div class="activity-cell">
            <div class="activity-icon-badge" style="background:${habit.color || '#06b6d4'};">
              <i class="fa-solid ${habit.icon || 'fa-star'}"></i>
            </div>
            <div class="activity-info">
              <h4>${this.escapeHTML(habit.name)}</h4>
              <div class="activity-goal-meta">
                <span>Target: ${habit.goalValue} ${this.getUnitLabelText(habit.metricType, habit.goalUnit)}</span>
                ${streak > 0 ? `<span class="streak-pill">🔥 ${streak}d</span>` : ''}
              </div>
            </div>
          </div>
        </td>
      `;

      let daysHTML = '';
      dayStrs.forEach(dayStr => {
        const logKey = `${habit.id}_${dayStr}`;
        const log = logs[logKey];

        if (habit.metricType === 'checkbox') {
          const isChecked = log && Number(log.value) > 0;
          daysHTML += `
            <td class="col-day day-cell">
              <button class="cell-check-btn ${isChecked ? 'checked' : ''}" 
                      onclick="app.toggleCheck('${habit.id}', '${dayStr}')"
                      title="${isChecked ? 'Mark Incomplete' : 'Mark Complete'}">
                <i class="fa-solid ${isChecked ? 'fa-check' : 'fa-plus'}"></i>
              </button>
            </td>
          `;
        } else {
          const hasVal = log && log.value !== undefined && log.value !== '';
          let badgeText = '+ Log';
          let customClass = '';

          if (hasVal) {
            const valNum = Number(log.value);
            if (habit.metricType === 'duration') badgeText = `${valNum}m`;
            else if (habit.metricType === 'count') badgeText = `${valNum}`;
            else if (habit.metricType === 'currency') {
              badgeText = (valNum >= 0 ? '+' : '') + `$${valNum}`;
              customClass = valNum >= 0 ? 'pnl-plus' : 'pnl-minus';
            }
          }

          daysHTML += `
            <td class="col-day day-cell">
              <span class="cell-value-badge ${hasVal ? 'has-value' : ''} ${customClass}" 
                    onclick="app.openLogModal('${habit.id}', '${dayStr}')"
                    title="${log && log.notes ? this.escapeHTML(log.notes) : 'Click to log'}">
                ${badgeText}
              </span>
            </td>
          `;
        }
      });

      let progressHTML = `
        <td class="col-progress">
          <div class="matrix-progress-wrapper">
            <div class="matrix-progress-text">
              <span>${this.formatProgressDisplay(weekTotal, habit.metricType)}</span>
              <span>${progressPercent}%</span>
            </div>
            <div class="matrix-progress-bar">
              <div class="matrix-progress-fill" style="transform: scaleX(${progressRatio}); background: ${habit.color || '#06b6d4'};"></div>
            </div>
          </div>
        </td>
      `;

      let actionsHTML = `
        <td class="col-actions">
          <button class="btn btn-icon btn-sm" onclick="app.openHabitModal('${habit.id}')" title="Edit Goal">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-icon btn-sm text-danger" onclick="app.deleteHabit('${habit.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;

      tr.innerHTML = activityHTML + daysHTML + progressHTML + actionsHTML;
      fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  calculateStreak(habitId, logs) {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = StorageManager.formatDateISO(d);
      const log = logs[`${habitId}_${dayStr}`];

      if (log && ((log.value !== undefined && Number(log.value) > 0) || Number(log.value) < 0)) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  }

  renderKPICards(weekDetails, habits, logs) {
    const dayStrs = weekDetails.days.map(d => StorageManager.formatDateISO(d));

    let totalGoals = habits.length;
    let completedGoals = 0;
    let totalPctSum = 0;

    habits.forEach(h => {
      let weekTotal = 0;
      dayStrs.forEach(d => {
        const log = logs[`${h.id}_${d}`];
        if (log) {
          if (h.metricType === 'checkbox') weekTotal += Number(log.value) > 0 ? 1 : 0;
          else weekTotal += Number(log.value) || 0;
        }
      });
      const pct = Math.min(100, Math.round((weekTotal / (h.goalValue || 1)) * 100));
      totalPctSum += pct;
      if (pct >= 100) completedGoals++;
    });

    const overallScore = totalGoals > 0 ? Math.round(totalPctSum / totalGoals) : 0;
    
    document.getElementById('kpi-score-val').textContent = `${overallScore}%`;
    document.getElementById('kpi-score-subtext').textContent = `${completedGoals} of ${totalGoals} goals reached`;
    const ringFill = document.getElementById('score-ring-fill');
    if (ringFill) {
      ringFill.setAttribute('stroke-dasharray', `${overallScore}, 100`);
    }

    const badgeEl = document.getElementById('kpi-score-badge');
    if (overallScore >= 80) badgeEl.textContent = 'Crushing It 🔥';
    else if (overallScore >= 50) badgeEl.textContent = 'On Track 👍';
    else badgeEl.textContent = 'Push Harder 💪';

    // Sport Total
    const sportHabits = habits.filter(h => h.category === 'Sport');
    let sportMins = 0;
    let sportGoal = 0;
    sportHabits.forEach(h => {
      sportGoal += Number(h.goalValue) || 0;
      dayStrs.forEach(d => {
        const log = logs[`${h.id}_${d}`];
        if (log) sportMins += Number(log.value) || 0;
      });
    });

    const hours = Math.floor(sportMins / 60);
    const mins = sportMins % 60;
    document.getElementById('kpi-sport-val').textContent = `${hours}h ${mins}m`;
    document.getElementById('kpi-sport-target').textContent = `/ ${sportGoal || 180}m goal`;
    const sportRatio = sportGoal > 0 ? Math.min(1, Math.max(0, sportMins / sportGoal)) : 0;
    document.getElementById('kpi-sport-bar').style.transform = `scaleX(${sportRatio})`;

    // Trading P&L
    const tradingHabits = habits.filter(h => h.category === 'Trading' || h.metricType === 'currency');
    let netPnL = 0;
    let tradeSessions = 0;
    let winSessions = 0;

    tradingHabits.forEach(h => {
      dayStrs.forEach(d => {
        const log = logs[`${h.id}_${d}`];
        if (log && log.value !== undefined && log.value !== '') {
          const val = Number(log.value);
          netPnL += val;
          tradeSessions++;
          if (val > 0) winSessions++;
        }
      });
    });

    const pnlSign = netPnL >= 0 ? '+' : '';
    const tradingValEl = document.getElementById('kpi-trading-val');
    tradingValEl.textContent = `${pnlSign}$${netPnL.toFixed(2)}`;
    tradingValEl.style.color = netPnL >= 0 ? 'var(--color-sport)' : 'var(--color-danger)';

    const winRate = tradeSessions > 0 ? Math.round((winSessions / tradeSessions) * 100) : 0;
    document.getElementById('kpi-trading-winrate').textContent = `${tradeSessions} trades (${winRate}% win rate)`;

    // Reading Total
    const readingHabits = habits.filter(h => h.category === 'Reading');
    let pagesRead = 0;
    let pagesGoal = 0;
    readingHabits.forEach(h => {
      pagesGoal += Number(h.goalValue) || 0;
      dayStrs.forEach(d => {
        const log = logs[`${h.id}_${d}`];
        if (log) pagesRead += Number(log.value) || 0;
      });
    });

    document.getElementById('kpi-reading-val').textContent = `${pagesRead}`;
    document.getElementById('kpi-reading-target').textContent = `/ ${pagesGoal || 150} pages`;
    const readingRatio = pagesGoal > 0 ? Math.min(1, Math.max(0, pagesRead / pagesGoal)) : 0;
    document.getElementById('kpi-reading-bar').style.transform = `scaleX(${readingRatio})`;

    const chartNetPnLEl = document.getElementById('chart-net-pnl');
    if (chartNetPnLEl) {
      chartNetPnLEl.textContent = `Net: ${pnlSign}$${netPnL.toFixed(2)}`;
      chartNetPnLEl.className = `stat-badge ${netPnL >= 0 ? 'pnl-positive' : 'pnl-negative'}`;
    }
    const chartWinrateEl = document.getElementById('chart-winrate');
    if (chartWinrateEl) {
      chartWinrateEl.textContent = `Win Rate: ${winRate}%`;
    }
  }

  renderCharts() {
    const weekDetails = StorageManager.getWeekDetails(this.currentMonday);
    const habits = StorageManager.getHabits();
    const logs = StorageManager.getLogs();
    const filterCat = document.getElementById('activity-chart-mode')?.value || 'all';

    ChartStudio.renderActivityChart('weekly-activity-chart', weekDetails.days, habits, logs, filterCat);
    ChartStudio.renderCategoryPie('category-pie-chart', habits, logs, weekDetails.days);
    ChartStudio.renderTradingChart('trading-pnl-chart', habits, logs, weekDetails.days);
    ChartStudio.renderReadingChart('reading-pace-chart', habits, logs, weekDetails.days);
  }

  toggleCheck(habitId, dateStr) {
    const logs = StorageManager.getLogs();
    const logKey = `${habitId}_${dateStr}`;
    const currentVal = logs[logKey] && Number(logs[logKey].value) > 0 ? 1 : 0;

    if (currentVal === 1) {
      delete logs[logKey];
    } else {
      logs[logKey] = { habitId, date: dateStr, value: 1, notes: 'Completed' };
    }

    StorageManager.saveLogs(logs);
    this.render();
  }

  openHabitModal(habitId = null) {
    const modal = document.getElementById('add-habit-modal');
    const titleEl = document.getElementById('modal-habit-title');
    const form = document.getElementById('habit-form');

    form.reset();
    document.getElementById('habit-id').value = habitId || '';

    if (habitId) {
      titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Activity Goal';
      const habits = StorageManager.getHabits();
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        document.getElementById('habit-name').value = habit.name;
        document.getElementById('habit-category').value = habit.category;
        document.getElementById('habit-icon').value = habit.icon;
        document.getElementById('habit-metric-type').value = habit.metricType;
        document.getElementById('habit-goal-val').value = habit.goalValue;
        this.updateGoalUnitLabel(habit.metricType);

        const radio = form.querySelector(`input[name="habit-color"][value="${habit.color}"]`);
        if (radio) radio.checked = true;
      }
    } else {
      titleEl.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add Activity to Track';
      this.updateGoalUnitLabel('checkbox');
    }

    modal.classList.remove('hidden');
  }

  closeHabitModal() {
    document.getElementById('add-habit-modal').classList.add('hidden');
  }

  updateGoalUnitLabel(metricType) {
    const unitLabel = document.getElementById('goal-unit-label');
    if (metricType === 'checkbox') unitLabel.textContent = 'times/week';
    else if (metricType === 'duration') unitLabel.textContent = 'mins/week';
    else if (metricType === 'count') unitLabel.textContent = 'units/week';
    else if (metricType === 'currency') unitLabel.textContent = '$/week';
  }

  handleSaveHabit(e) {
    e.preventDefault();
    const habitId = document.getElementById('habit-id').value;
    const name = document.getElementById('habit-name').value.trim();
    const category = document.getElementById('habit-category').value;
    const icon = document.getElementById('habit-icon').value;
    const metricType = document.getElementById('habit-metric-type').value;
    const goalValue = Number(document.getElementById('habit-goal-val').value) || 1;
    const color = document.querySelector('input[name="habit-color"]:checked')?.value || '#06b6d4';

    const habits = StorageManager.getHabits();

    if (habitId) {
      const idx = habits.findIndex(h => h.id === habitId);
      if (idx !== -1) {
        habits[idx] = {
          ...habits[idx],
          name, category, icon, metricType, goalValue, color,
          goalUnit: this.getUnitLabelText(metricType)
        };
      }
    } else {
      const newHabit = {
        id: `h_${Date.now()}`,
        name, category, icon, metricType, goalValue, color,
        goalUnit: this.getUnitLabelText(metricType),
        createdAt: new Date().toISOString()
      };
      habits.push(newHabit);
    }

    StorageManager.saveHabits(habits);
    this.closeHabitModal();
    this.showToast(`Activity "${name}" saved successfully!`, 'success');
    this.render();
  }

  deleteHabit(habitId) {
    if (confirm('Delete this activity and its recorded logs?')) {
      let habits = StorageManager.getHabits();
      habits = habits.filter(h => h.id !== habitId);
      StorageManager.saveHabits(habits);

      const logs = StorageManager.getLogs();
      Object.keys(logs).forEach(key => {
        if (key.startsWith(`${habitId}_`)) delete logs[key];
      });
      StorageManager.saveLogs(logs);

      this.showToast('Activity deleted.', 'info');
      this.render();
    }
  }

  openLogModal(habitId = null, dateStr = null) {
    const habits = StorageManager.getHabits();
    if (habits.length === 0) {
      this.showToast('Please add an activity first!', 'info');
      return;
    }

    const modal = document.getElementById('log-entry-modal');
    const select = document.getElementById('log-habit-select');
    select.innerHTML = habits.map(h => `<option value="${h.id}">${this.escapeHTML(h.name)} (${h.category})</option>`).join('');

    const targetHabitId = habitId || habits[0].id;
    select.value = targetHabitId;

    const dateInput = document.getElementById('log-date');
    dateInput.value = dateStr || StorageManager.formatDateISO(new Date());

    const logs = StorageManager.getLogs();
    const logKey = `${targetHabitId}_${dateInput.value}`;
    const existingLog = logs[logKey];

    document.getElementById('log-value').value = existingLog ? existingLog.value : '';
    document.getElementById('log-notes').value = existingLog ? (existingLog.notes || '') : '';

    this.updateLogValueInputLabel(targetHabitId);

    modal.classList.remove('hidden');
  }

  closeLogModal() {
    document.getElementById('log-entry-modal').classList.add('hidden');
  }

  updateLogValueInputLabel(habitId) {
    const habits = StorageManager.getHabits();
    const habit = habits.find(h => h.id === habitId);
    const label = document.getElementById('log-val-label');
    const input = document.getElementById('log-value');

    if (!habit) return;

    if (habit.metricType === 'duration') {
      label.textContent = 'Duration (Minutes)';
      input.placeholder = 'e.g. 60';
    } else if (habit.metricType === 'count') {
      label.textContent = 'Amount / Pages / Reps';
      input.placeholder = 'e.g. 25';
    } else if (habit.metricType === 'currency') {
      label.textContent = 'Net Session P&L ($)';
      input.placeholder = 'e.g. +150 or -40';
    } else {
      label.textContent = 'Status (1 = Done, 0 = Missed)';
      input.placeholder = '1';
    }
  }

  handleSaveLog(e) {
    e.preventDefault();
    const habitId = document.getElementById('log-habit-select').value;
    const dateStr = document.getElementById('log-date').value;
    const value = Number(document.getElementById('log-value').value);
    const notes = document.getElementById('log-notes').value.trim();

    if (isNaN(value)) {
      this.showToast('Please enter a valid numeric value.', 'danger');
      return;
    }

    const logs = StorageManager.getLogs();
    const logKey = `${habitId}_${dateStr}`;
    logs[logKey] = { habitId, date: dateStr, value, notes };

    StorageManager.saveLogs(logs);
    this.closeLogModal();
    this.showToast('Log entry saved!', 'success');
    this.render();
  }

  loadReflection(weekKey) {
    const reflections = StorageManager.getReflections();
    const note = reflections[weekKey] || {};

    document.getElementById('reflection-wins').value = note.wins || '';
    document.getElementById('reflection-lessons').value = note.lessons || '';
    document.getElementById('reflection-next').value = note.next || '';
  }

  saveReflection() {
    const weekDetails = StorageManager.getWeekDetails(this.currentMonday);
    const reflections = StorageManager.getReflections();

    reflections[weekDetails.weekKey] = {
      wins: document.getElementById('reflection-wins').value,
      lessons: document.getElementById('reflection-lessons').value,
      next: document.getElementById('reflection-next').value
    };

    StorageManager.saveReflections(reflections);
    this.showToast('Weekly reflection notes saved!', 'success');
  }

  getUnitLabelText(metricType, customUnit = null) {
    if (customUnit) return customUnit;
    if (metricType === 'checkbox') return 'times/week';
    if (metricType === 'duration') return 'mins/week';
    if (metricType === 'count') return 'units/week';
    if (metricType === 'currency') return '$/week';
    return 'per week';
  }

  formatProgressDisplay(total, metricType) {
    if (metricType === 'duration') return `${total}m`;
    if (metricType === 'currency') return (total >= 0 ? '+' : '') + `$${total.toFixed(2)}`;
    return `${total}`;
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TrackPulseApp();
});
