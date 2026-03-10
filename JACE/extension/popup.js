const DEFAULT_CONFIG = {
  NUM_QUESTIONS: 2,
  MAX_LOOPS: 2,
  INTENT_THRESHOLD: 3,
  APPEND_PLANNING_TO_PROMPT: true,
  LOG_DATA: true,
  MIN_SCORE_ROUND_1: 70,
  MIN_SCORE_ROUND_2: 50,
  ENABLED_PLATFORMS: { chatgpt: true, claude: true, gemini: true, copilot: true },
};

let supabase = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof window.SupabaseClient !== 'undefined') {
      supabase = new window.SupabaseClient();
      console.log('[Popup] Supabase client initialized');
    } else {
      console.warn('[Popup] SupabaseClient not available - dashboard will use local storage only');
    }
  } catch (error) {
    console.error('[Popup] Failed to initialize Supabase:', error);
  }

  initTabs();
  loadDashboard();
  loadSettings();
  setupEventListeners();
});

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');

      if (tabName === 'dashboard') {
        loadDashboard();
      }
    });
  });
}

async function loadDashboard() {
  chrome.storage.local.get(['cti_participant_id'], async (result) => {
    const participantId = result.cti_participant_id;

    if (!participantId || !supabase) {
      chrome.storage.local.get(['cti_logs'], (result) => {
        const logs = result.cti_logs || [];
        updateStatsFromLogs(logs);
        updateHistoryFromLogs(logs);
      });
      return;
    }

    try {
      const stats = await supabase.getStats(participantId);
      updateStatsFromSupabase(stats);
      updateHistoryFromSupabase(stats.history);
    } catch (error) {
      console.error('[Dashboard] Error loading from Supabase:', error);
      chrome.storage.local.get(['cti_logs'], (result) => {
        const logs = result.cti_logs || [];
        updateStatsFromLogs(logs);
        updateHistoryFromLogs(logs);
      });
    }
  });
}

function updateStatsFromSupabase(stats) {
  document.getElementById('total-prompts').textContent = stats.totalPrompts;
  document.getElementById('avg-score').textContent = stats.avgScore || '-';
  document.getElementById('skip-rate').textContent = `${stats.skipRate}%`;
  applySkipRateColor(stats.skipRate);
  if (stats.avgScore != null) applyAvgScoreColor(parseFloat(stats.avgScore));
}

function updateHistoryFromSupabase(history) {
  const historyList = document.getElementById('history-list');

  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No activity yet. Start using JACE on supported platforms!</div>';
    return;
  }

  historyList.innerHTML = history.slice(0, 10).map(query => {
    const date = new Date(query.created_at);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let statusBadge = '';
    if (query.skipped) {
      statusBadge = '<span class="history-badge skipped">Skipped</span>';
    } else if (query.completed) {
      statusBadge = '<span class="history-badge completed">Completed</span>';
    }
    const scoreHTML = query.final_score !== null
      ? `<span class="history-score">${query.final_score}<span class="history-score-denom">/100</span></span>`
      : '';

    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-platform">${query.platform}</span>
          <span class="history-time">${dateStr} ${timeStr}</span>
        </div>
        <div class="history-prompt">${escapeHtml(query.original_prompt)}</div>
        <div class="history-footer">
          <div>${statusBadge}</div>
          ${scoreHTML}
        </div>
      </div>
    `;
  }).join('');
}

function updateStatsFromLogs(logs) {
  const totalPrompts = logs.filter(log => log.eventType === 'prompt_intercepted').length;
  const skipped = logs.filter(log => log.eventType === 'skipped').length;

  // Prefer reflection_evaluated scores; fall back to reflection_approved.finalScore
  const evaluations = logs.filter(log => log.eventType === 'reflection_evaluated' && log.score);
  const approvedScores = evaluations.length === 0
    ? logs.filter(log => log.eventType === 'reflection_approved' && log.finalScore)
    : [];
  const allScores = evaluations.map(l => l.score).concat(approvedScores.map(l => l.finalScore));

  const avgScore = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : '-';

  const skipRate = totalPrompts > 0
    ? Math.round((skipped / totalPrompts) * 100)
    : 0;

  document.getElementById('total-prompts').textContent = totalPrompts;
  document.getElementById('avg-score').textContent = avgScore;
  document.getElementById('skip-rate').textContent = `${skipRate}%`;
  applySkipRateColor(skipRate);
  if (avgScore !== '-') applyAvgScoreColor(parseFloat(avgScore));
}

function updateHistoryFromLogs(logs) {
  const historyList = document.getElementById('history-list');

  const sessions = {};
  logs.forEach(log => {
    if (log.eventType === 'prompt_intercepted') {
      sessions[log.timestamp] = {
        timestamp: log.timestamp,
        platform: log.platform,
        prompt: log.prompt,
        skipped: false,
        completed: false,
        score: null,
      };
    }
  });

  logs.forEach(log => {
    const sessionKey = Object.keys(sessions).find(ts => {
      const timeDiff = new Date(log.timestamp) - new Date(ts);
      return timeDiff >= 0 && timeDiff < 300000;
    });

    if (sessionKey) {
      if (log.eventType === 'skipped') {
        sessions[sessionKey].skipped = true;
      }
      if (log.eventType === 'reflection_approved') {
        sessions[sessionKey].completed = true;
        if (log.finalScore && !sessions[sessionKey].score) {
          sessions[sessionKey].score = log.finalScore;
        }
      }
      if (log.eventType === 'reflection_evaluated' && log.score) {
        sessions[sessionKey].score = log.score;
      }
    }
  });

  const sessionList = Object.values(sessions).reverse().slice(0, 10);

  if (sessionList.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No activity yet. Start using JACE on supported platforms!</div>';
    return;
  }

  historyList.innerHTML = sessionList.map(session => {
    const date = new Date(session.timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let statusBadge = '';
    if (session.skipped) {
      statusBadge = '<span class="history-badge skipped">Skipped</span>';
    } else if (session.completed) {
      statusBadge = '<span class="history-badge completed">Completed</span>';
    }
    const scoreHTML = session.score !== null
      ? `<span class="history-score">${session.score}<span class="history-score-denom">/100</span></span>`
      : '';

    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-platform">${session.platform}</span>
          <span class="history-time">${dateStr} ${timeStr}</span>
        </div>
        <div class="history-prompt">${escapeHtml(session.prompt)}</div>
        <div class="history-footer">
          <div>${statusBadge}</div>
          ${scoreHTML}
        </div>
      </div>
    `;
  }).join('');
}

function loadSettings() {
  chrome.storage.local.get([
    'cti_participant_id',
    'cti_config',
  ], (result) => {
    const config = result.cti_config || DEFAULT_CONFIG;
    const enabled = config.ENABLED_PLATFORMS || DEFAULT_CONFIG.ENABLED_PLATFORMS;

    document.getElementById('participant-id').value = result.cti_participant_id || '';

    setSliderValue('num-questions', config.NUM_QUESTIONS || DEFAULT_CONFIG.NUM_QUESTIONS);
    setSliderValue('max-rounds', config.MAX_LOOPS || DEFAULT_CONFIG.MAX_LOOPS);
    setSliderValue('intent-threshold', config.INTENT_THRESHOLD || DEFAULT_CONFIG.INTENT_THRESHOLD);
    setSliderValue('min-score-r1', config.MIN_SCORE_ROUND_1 || DEFAULT_CONFIG.MIN_SCORE_ROUND_1);
    setSliderValue('min-score-r2', config.MIN_SCORE_ROUND_2 || DEFAULT_CONFIG.MIN_SCORE_ROUND_2);

    document.getElementById('append-context').checked = config.APPEND_PLANNING_TO_PROMPT !== false;
    document.getElementById('log-data').checked = config.LOG_DATA !== false;

    document.getElementById('platform-chatgpt').checked = enabled.chatgpt !== false;
    document.getElementById('platform-claude').checked = enabled.claude !== false;
    document.getElementById('platform-gemini').checked = enabled.gemini !== false;
    document.getElementById('platform-copilot').checked = enabled.copilot !== false;
  });
}

function setSliderValue(id, value) {
  const slider = document.getElementById(id);
  const valueDisplay = document.getElementById(`${id}-value`);
  slider.value = value;
  valueDisplay.textContent = value;
}

function updateSliderLabel(id) {
  const slider = document.getElementById(id);
  const valueDisplay = document.getElementById(`${id}-value`);
  valueDisplay.textContent = slider.value;
}

function setupEventListeners() {
  const sliders = ['num-questions', 'max-rounds', 'intent-threshold', 'min-score-r1', 'min-score-r2'];
  sliders.forEach(id => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);
    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });
  });

  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('export-logs').addEventListener('click', exportLogs);
  document.getElementById('clear-logs').addEventListener('click', clearLogs);
  document.getElementById('refresh-history').addEventListener('click', loadDashboard);
}

function saveSettings() {
  const participantId = document.getElementById('participant-id').value.trim();

  if (!participantId) {
    showMessage('Please enter a Participant ID', 'error');
    return;
  }

  const config = {
    NUM_QUESTIONS: parseInt(document.getElementById('num-questions').value),
    MAX_LOOPS: parseInt(document.getElementById('max-rounds').value),
    INTENT_THRESHOLD: parseInt(document.getElementById('intent-threshold').value),
    MIN_SCORE_ROUND_1: parseInt(document.getElementById('min-score-r1').value),
    MIN_SCORE_ROUND_2: parseInt(document.getElementById('min-score-r2').value),
    APPEND_PLANNING_TO_PROMPT: document.getElementById('append-context').checked,
    LOG_DATA: document.getElementById('log-data').checked,
    ENABLED_PLATFORMS: {
      chatgpt: document.getElementById('platform-chatgpt').checked,
      claude: document.getElementById('platform-claude').checked,
      gemini: document.getElementById('platform-gemini').checked,
      copilot: document.getElementById('platform-copilot').checked,
    },
  };

  chrome.storage.local.set({
    cti_participant_id: participantId,
    cti_consent_given: true,
    cti_config: config,
  }, () => {
    showMessage('Settings saved! JACE is now active. Refresh any open ChatGPT/Claude tabs.', 'success');
    console.log('[Popup] Settings saved - consent granted for participant:', participantId);
  });
}

function exportLogs() {
  chrome.storage.local.get(['cti_logs', 'cti_participant_id'], (result) => {
    const logs = result.cti_logs || [];
    const participantId = result.cti_participant_id || 'unknown';

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jace-logs-${participantId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage(`Exported ${logs.length} log entries`, 'success');
  });
}

function clearLogs() {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }

  chrome.storage.local.set({ cti_logs: [] }, () => {
    loadDashboard();
    showMessage('All data cleared', 'success');
  });
}

function showMessage(text, type) {
  const messageEl = document.getElementById('save-message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;

  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

function applySkipRateColor(rate) {
  const el = document.getElementById('skip-rate');
  if (!el) return;
  const colors = [
    '#20a565', // 0-10%
    '#52bf7e', // 10-20%
    '#8dce63', // 20-30%
    '#c4d44a', // 30-40%
    '#f0c030', // 40-50%
    '#f0a030', // 50-60%
    '#e87030', // 60-70%
    '#e04530', // 70-80%
    '#cc2020', // 80-90%
    '#a00000', // 90-100%
  ];
  const idx = Math.min(Math.floor(rate / 10), 9);
  el.style.color = colors[idx];
}

function applyAvgScoreColor(score) {
  const el = document.getElementById('avg-score');
  if (!el) return;
  if (score === 100) {
    el.style.color = '#a855f7';
    return;
  }
  const colors = [
    '#a00000', // 0-10
    '#cc2020', // 10-20
    '#e04530', // 20-30
    '#e87030', // 30-40
    '#f0a030', // 40-50
    '#f0c030', // 50-60
    '#c4d44a', // 60-70
    '#8dce63', // 70-80
    '#52bf7e', // 80-90
    '#20a565', // 90-99
  ];
  const idx = Math.min(Math.floor(score / 10), 9);
  el.style.color = colors[idx];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
