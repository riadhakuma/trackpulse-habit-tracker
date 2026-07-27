/**
 * TrackPulse Charts Studio - High-Performance Edition
 * Optimized Chart.js rendering with in-place updates & zero canvas teardown lag
 */

const ChartStudio = {
  instances: {},

  initThemeDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#9ca3af';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = '#111827';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { weight: 'bold', size: 13 };
    Chart.defaults.animation = false; // Disable heavy canvas animation loops for max smoothness
  },

  /**
   * Chart 1: Main Stacked Activity Bar Chart (Mon-Sun)
   */
  renderActivityChart(canvasId, weekDays, habits, logs, filterCategory = 'all') {
    this.initThemeDefaults();

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = weekDays.map(d => StorageManager.formatDayHeader(d).shortLabel);
    const dayStrs = weekDays.map(d => StorageManager.formatDateISO(d));

    const filteredHabits = habits.filter(h => {
      if (filterCategory === 'all') return true;
      return h.category === filterCategory;
    });

    const datasets = filteredHabits.map(habit => {
      const dataPoints = dayStrs.map(dayStr => {
        const log = logs[`${habit.id}_${dayStr}`];
        if (!log) return 0;
        return Number(log.value) || 0;
      });

      return {
        label: habit.name,
        data: dataPoints,
        backgroundColor: habit.color || '#06b6d4',
        borderRadius: 6,
        borderSkipped: false
      };
    });

    if (this.instances[canvasId]) {
      // In-place chart update for 60fps responsiveness
      const chart = this.instances[canvasId];
      chart.data.labels = labels;
      chart.data.datasets = datasets;
      chart.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  },

  /**
   * Chart 2: Category Distribution Doughnut Chart
   */
  renderCategoryPie(canvasId, habits, logs, weekDays) {
    this.initThemeDefaults();

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const dayStrs = weekDays.map(d => StorageManager.formatDateISO(d));
    const categoryTotals = {
      'Sport': 0,
      'Trading': 0,
      'Reading': 0,
      'Health': 0,
      'Productivity': 0,
      'Custom': 0
    };

    habits.forEach(h => {
      let habitTotal = 0;
      dayStrs.forEach(d => {
        const log = logs[`${h.id}_${d}`];
        if (log) {
          if (h.metricType === 'checkbox') habitTotal += 1;
          else if (h.metricType === 'currency') habitTotal += (Math.abs(Number(log.value)) > 0 ? 1 : 0);
          else habitTotal += Math.max(0, Number(log.value) || 0);
        }
      });
      const cat = h.category || 'Custom';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + habitTotal;
    });

    const activeCategories = Object.keys(categoryTotals).filter(cat => categoryTotals[cat] > 0);
    const dataValues = activeCategories.map(cat => categoryTotals[cat]);

    const colorMap = {
      'Sport': '#10b981',
      'Trading': '#f59e0b',
      'Reading': '#3b82f6',
      'Health': '#06b6d4',
      'Productivity': '#8b5cf6',
      'Custom': '#ec4899'
    };

    const backgroundColors = activeCategories.map(cat => colorMap[cat] || '#06b6d4');
    const pieLabels = activeCategories.length > 0 ? activeCategories : ['No Data'];
    const pieData = dataValues.length > 0 ? dataValues : [1];
    const pieColors = backgroundColors.length > 0 ? backgroundColors : ['rgba(255, 255, 255, 0.1)'];

    if (this.instances[canvasId]) {
      const chart = this.instances[canvasId];
      chart.data.labels = pieLabels;
      chart.data.datasets[0].data = pieData;
      chart.data.datasets[0].backgroundColor = pieColors;
      chart.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: pieLabels,
        datasets: [{
          data: pieData,
          backgroundColor: pieColors,
          borderWidth: 2,
          borderColor: '#111827'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }
        },
        cutout: '70%'
      }
    });
  },

  /**
   * Chart 3: Trading Daily P&L Chart
   */
  renderTradingChart(canvasId, habits, logs, weekDays) {
    this.initThemeDefaults();

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = weekDays.map(d => StorageManager.formatDayHeader(d).shortLabel);
    const dayStrs = weekDays.map(d => StorageManager.formatDateISO(d));

    const tradingHabits = habits.filter(h => h.category === 'Trading' || h.metricType === 'currency');
    
    const dailyPnL = dayStrs.map(d => {
      let daySum = 0;
      tradingHabits.forEach(h => {
        const log = logs[`${h.id}_${d}`];
        if (log) daySum += Number(log.value) || 0;
      });
      return daySum;
    });

    let runningNet = 0;
    const cumulativePnL = dailyPnL.map(v => {
      runningNet += v;
      return runningNet;
    });

    const barColors = dailyPnL.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)');

    if (this.instances[canvasId]) {
      const chart = this.instances[canvasId];
      chart.data.labels = labels;
      chart.data.datasets[0].data = cumulativePnL;
      chart.data.datasets[1].data = dailyPnL;
      chart.data.datasets[1].backgroundColor = barColors;
      chart.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Cumulative Net P&L ($)',
            data: cumulativePnL,
            borderColor: '#f59e0b',
            borderWidth: 3,
            fill: false,
            tension: 0.3,
            pointBackgroundColor: '#f59e0b',
            pointRadius: 4
          },
          {
            type: 'bar',
            label: 'Daily Session P&L ($)',
            data: dailyPnL,
            backgroundColor: barColors,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              callback: function(value) {
                return (value >= 0 ? '+' : '') + '$' + value;
              }
            }
          }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.parsed.y;
                const sign = val >= 0 ? '+' : '';
                return `${context.dataset.label}: ${sign}$${val.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * Chart 4: Reading Pace Bar Chart
   */
  renderReadingChart(canvasId, habits, logs, weekDays) {
    this.initThemeDefaults();

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = weekDays.map(d => StorageManager.formatDayHeader(d).shortLabel);
    const dayStrs = weekDays.map(d => StorageManager.formatDateISO(d));

    const readingHabits = habits.filter(h => h.category === 'Reading' || h.name.toLowerCase().includes('read'));
    const goalValue = readingHabits.length > 0 ? (readingHabits[0].goalValue || 140) : 140;
    const dailyTarget = Math.round(goalValue / 7);

    const dailyPages = dayStrs.map(d => {
      let daySum = 0;
      readingHabits.forEach(h => {
        const log = logs[`${h.id}_${d}`];
        if (log) daySum += Math.max(0, Number(log.value) || 0);
      });
      return daySum;
    });

    const targetLine = dayStrs.map(() => dailyTarget);

    if (this.instances[canvasId]) {
      const chart = this.instances[canvasId];
      chart.data.labels = labels;
      chart.data.datasets[0].data = targetLine;
      chart.data.datasets[0].label = `Daily Goal (${dailyTarget} pages/day)`;
      chart.data.datasets[1].data = dailyPages;
      chart.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: `Daily Goal (${dailyTarget} pages/day)`,
            data: targetLine,
            borderColor: 'rgba(59, 130, 246, 0.5)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            type: 'bar',
            label: 'Pages Read',
            data: dailyPages,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            hoverBackgroundColor: '#3b82f6',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }
};
