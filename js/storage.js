/**
 * TrackPulse Storage & API Data Manager - Backend Sync & Multi-User Edition
 */

const STORAGE_KEYS = {
  USER: 'trackpulse_user_session_v1',
  HABITS: 'trackpulse_habits_v1',
  LOGS: 'trackpulse_logs_v1',
  REFLECTIONS: 'trackpulse_reflections_v1'
};

const StorageManager = {
  currentUser: null,

  initUserSession() {
    const session = localStorage.getItem(STORAGE_KEYS.USER);
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
      } catch (e) {
        this.currentUser = null;
      }
    }
  },

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.setCurrentUser(data.user);
        await this.syncFromBackend();
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      console.warn('Backend unavailable, using local session:', err);
      // Offline fallback login for admin RIADH
      if (username.toUpperCase() === 'RIADH' && password === 'admin123') {
        const adminUser = { id: 'usr_admin_1', username: 'RIADH', role: 'admin' };
        this.setCurrentUser(adminUser);
        return { success: true, user: adminUser };
      }
      return { success: false, error: 'Could not connect to server' };
    }
  },

  async register(username, password) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.setCurrentUser(data.user);
        await this.syncFromBackend();
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, error: 'Could not connect to server' };
    }
  },

  logout() {
    this.setCurrentUser(null);
  },

  async syncFromBackend() {
    if (!this.currentUser) return;
    try {
      const res = await fetch(`/api/user/data/${this.currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.habits) this.saveHabits(data.habits, false);
        if (data.logs) this.saveLogs(data.logs, false);
        if (data.reflections) this.saveReflections(data.reflections, false);
      }
    } catch (e) {
      console.warn('Backend sync failed, using local copy:', e);
    }
  },

  async syncToBackend() {
    if (!this.currentUser) return;
    try {
      await fetch(`/api/user/data/${this.currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: this.getHabits(),
          logs: this.getLogs(),
          reflections: this.getReflections()
        })
      });
    } catch (e) {
      console.warn('Backend sync update failed:', e);
    }
  },

  async fetchAdminOverview() {
    if (!this.currentUser || this.currentUser.role !== 'admin') return null;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { 'x-user-id': this.currentUser.id }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Admin overview fetch failed:', e);
    }
    return null;
  },

  // Date & Week Utilities
  getWeekDetails(date = new Date()) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(target);
      d.setDate(target.getDate() + i);
      weekDays.push(d);
    }

    const mondayStr = this.formatDateISO(weekDays[0]);
    const sundayStr = this.formatDateISO(weekDays[6]);

    return {
      monday: weekDays[0],
      sunday: weekDays[6],
      days: weekDays,
      weekKey: `${mondayStr}_${sundayStr}`,
      mondayStr,
      sundayStr
    };
  },

  formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDayHeader(date) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()],
      shortLabel: `${dayNames[date.getDay()]} ${date.getDate()}`
    };
  },

  // Storage Methods
  getHabits() {
    const key = this.currentUser ? `${STORAGE_KEYS.HABITS}_${this.currentUser.id}` : STORAGE_KEYS.HABITS;
    const data = localStorage.getItem(key);
    if (!data) return this.getDefaultHabits();
    try {
      return JSON.parse(data);
    } catch (e) {
      return this.getDefaultHabits();
    }
  },

  saveHabits(habits, syncBackend = true) {
    const key = this.currentUser ? `${STORAGE_KEYS.HABITS}_${this.currentUser.id}` : STORAGE_KEYS.HABITS;
    localStorage.setItem(key, JSON.stringify(habits));
    if (syncBackend) this.syncToBackend();
  },

  getLogs() {
    const key = this.currentUser ? `${STORAGE_KEYS.LOGS}_${this.currentUser.id}` : STORAGE_KEYS.LOGS;
    const data = localStorage.getItem(key);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  },

  saveLogs(logs, syncBackend = true) {
    const key = this.currentUser ? `${STORAGE_KEYS.LOGS}_${this.currentUser.id}` : STORAGE_KEYS.LOGS;
    localStorage.setItem(key, JSON.stringify(logs));
    if (syncBackend) this.syncToBackend();
  },

  getReflections() {
    const key = this.currentUser ? `${STORAGE_KEYS.REFLECTIONS}_${this.currentUser.id}` : STORAGE_KEYS.REFLECTIONS;
    const data = localStorage.getItem(key);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  },

  saveReflections(reflections, syncBackend = true) {
    const key = this.currentUser ? `${STORAGE_KEYS.REFLECTIONS}_${this.currentUser.id}` : STORAGE_KEYS.REFLECTIONS;
    localStorage.setItem(key, JSON.stringify(reflections));
    if (syncBackend) this.syncToBackend();
  },

  getDefaultHabits() {
    return [
      { id: 'h_sport_1', name: 'Gym & Fitness Workout', category: 'Sport', icon: 'fa-dumbbell', metricType: 'duration', goalValue: 180, goalUnit: 'mins/week', color: '#10b981', createdAt: new Date().toISOString() },
      { id: 'h_trading_1', name: 'FX Trading Sessions', category: 'Trading', icon: 'fa-chart-line', metricType: 'currency', goalValue: 350, goalUnit: '$/week', color: '#f59e0b', createdAt: new Date().toISOString() },
      { id: 'h_reading_1', name: 'Book Reading Pace', category: 'Reading', icon: 'fa-book', metricType: 'count', goalValue: 150, goalUnit: 'pages/week', color: '#3b82f6', createdAt: new Date().toISOString() },
      { id: 'h_health_1', name: 'Morning Meditation', category: 'Health', icon: 'fa-brain', metricType: 'checkbox', goalValue: 5, goalUnit: 'times/week', color: '#06b6d4', createdAt: new Date().toISOString() }
    ];
  },

  seedDemoData(currentMondayDate) {
    const weekDetails = this.getWeekDetails(currentMondayDate);
    const habits = this.getDefaultHabits();
    this.saveHabits(habits);

    const logs = {};
    const dayStrs = weekDetails.days.map(d => this.formatDateISO(d));

    logs[`h_sport_1_${dayStrs[0]}`] = { habitId: 'h_sport_1', date: dayStrs[0], value: 60, notes: 'Upper body workout' };
    logs[`h_sport_1_${dayStrs[2]}`] = { habitId: 'h_sport_1', date: dayStrs[2], value: 45, notes: 'Leg day heavy squats' };
    logs[`h_sport_1_${dayStrs[4]}`] = { habitId: 'h_sport_1', date: dayStrs[4], value: 60, notes: 'Push workout + cardio' };

    logs[`h_trading_1_${dayStrs[0]}`] = { habitId: 'h_trading_1', date: dayStrs[0], value: 120, notes: 'EUR/USD Long +2R' };
    logs[`h_trading_1_${dayStrs[1]}`] = { habitId: 'h_trading_1', date: dayStrs[1], value: 180, notes: 'GBP/JPY Trend' };
    logs[`h_trading_1_${dayStrs[2]}`] = { habitId: 'h_trading_1', date: dayStrs[2], value: -60, notes: 'Stopped out early' };
    logs[`h_trading_1_${dayStrs[3]}`] = { habitId: 'h_trading_1', date: dayStrs[3], value: 140, notes: 'Gold scalp trade' };

    logs[`h_reading_1_${dayStrs[0]}`] = { habitId: 'h_reading_1', date: dayStrs[0], value: 25, notes: 'Atomic Habits Ch 2' };
    logs[`h_reading_1_${dayStrs[1]}`] = { habitId: 'h_reading_1', date: dayStrs[1], value: 30, notes: 'Atomic Habits Ch 3' };
    logs[`h_reading_1_${dayStrs[2]}`] = { habitId: 'h_reading_1', date: dayStrs[2], value: 25, notes: 'Trading in the Zone' };

    this.saveLogs(logs);

    const reflections = {};
    reflections[weekDetails.weekKey] = {
      wins: 'Stuck to trading risk management. Passed 150 pages read.',
      lessons: 'Cut losing trades faster on Wednesday.',
      next: 'Target $400 weekly net trading profit.'
    };
    this.saveReflections(reflections);

    return { habits, logs, reflections };
  },

  exportJSON() {
    const data = {
      habits: this.getHabits(),
      logs: this.getLogs(),
      reflections: this.getReflections(),
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trackpulse_export_${this.formatDateISO(new Date())}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.habits && Array.isArray(parsed.habits)) this.saveHabits(parsed.habits);
      if (parsed.logs) this.saveLogs(parsed.logs);
      if (parsed.reflections) this.saveReflections(parsed.reflections);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  },

  clearAll() {
    const habitKey = this.currentUser ? `${STORAGE_KEYS.HABITS}_${this.currentUser.id}` : STORAGE_KEYS.HABITS;
    const logKey = this.currentUser ? `${STORAGE_KEYS.LOGS}_${this.currentUser.id}` : STORAGE_KEYS.LOGS;
    const reflKey = this.currentUser ? `${STORAGE_KEYS.REFLECTIONS}_${this.currentUser.id}` : STORAGE_KEYS.REFLECTIONS;
    localStorage.removeItem(habitKey);
    localStorage.removeItem(logKey);
    localStorage.removeItem(reflKey);
  }
};
