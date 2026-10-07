(function () {
  const STORAGE_KEY = 'commisave-user';
  const firebaseReady = typeof window !== 'undefined' && window.firebase && window.firebase.apps && window.firebase.apps.length > 0;
  const db = firebaseReady ? window.firebase.firestore() : null;
  const auth = firebaseReady ? window.firebase.auth() : null;

  const formatCurrency = (value) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value || 0);
  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  function getStoredUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function buildFullName(user) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Guest User';
  }

  function getTelemetryHistory() {
    try {
      const stored = localStorage.getItem('commisave-telemetry');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  function saveTelemetryHistory(events) {
    localStorage.setItem('commisave-telemetry', JSON.stringify(events));
  }

  function computeTrustMetrics(user, telemetryEvents) {
    const history = Array.isArray(telemetryEvents) ? telemetryEvents : [];
    const peerTrust = Math.max(0, Math.min(100, Number((user && user.stats && user.stats.trustScore) || 95)));
    const recentEvents = history.slice(0, 6);

    if (!history.length) {
      return {
        score: peerTrust,
        risk: Math.max(4, 100 - peerTrust),
        band: 'Stable',
        anomalyFlag: false,
        forecastLabel: 'Healthy outlook',
        payoutAdvice: 'Payout order remains balanced.'
      };
    }

    const daysLate = history.reduce((sum, item) => sum + Math.max(0, Number(item.daysLate || 0)), 0) / history.length;
    const daysEarly = history.reduce((sum, item) => sum + Math.max(0, Number(item.daysEarly || 0)), 0) / history.length;
    const earlyExitCount = history.filter((item) => item.exitedEarly).length;
    const depositVolume = recentEvents.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0) / 1000;

    const punctualityScore = Math.max(0, Math.min(100, 100 - (daysLate * 8) - (daysEarly * 1.5)));
    const consistencyScore = Math.max(0, Math.min(100, 48 + (history.length * 7) + Math.min(20, depositVolume / 120)));
    const exitScore = Math.max(0, Math.min(100, 100 - (earlyExitCount * 18)));
    const peerScore = peerTrust;
    const trustScore = Math.max(60, Math.min(99, Math.round((punctualityScore * 0.35) + (consistencyScore * 0.25) + (exitScore * 0.2) + (peerScore * 0.2))));
    const riskPercent = Math.max(1, 100 - trustScore);

    const rapidVelocity = history.filter((item) => {
      const createdAt = new Date(item.createdAt || Date.now());
      return Date.now() - createdAt.getTime() < 10 * 60 * 1000;
    }).length;
    const anomalyFlag = rapidVelocity >= 3 || depositVolume > 4000;

    let band = 'Stable';
    let forecastLabel = 'Healthy outlook';
    let payoutAdvice = 'Payout order remains balanced.';

    if (trustScore >= 92) {
      band = 'Low risk';
      forecastLabel = 'Strong cash flow';
      payoutAdvice = 'Keep the member later in the cycle for better buffer protection.';
    } else if (trustScore >= 80) {
      band = 'Moderate risk';
      forecastLabel = 'Watch the next cycle';
      payoutAdvice = 'Use a short lock or earlier buffer review.';
    } else {
      band = 'Needs review';
      forecastLabel = 'Higher default risk';
      payoutAdvice = 'Protect the group with a tighter payout rotation and a buffer.';
    }

    return {
      score: trustScore,
      risk: riskPercent,
      band,
      anomalyFlag,
      forecastLabel,
      payoutAdvice,
      punctualityScore,
      consistencyScore,
      exitScore,
      peerScore,
      historyLength: history.length
    };
  }

  function renderExploreInsights(user) {
    const container = document.getElementById('riskInsightsList');
    if (!container) return;

    const metrics = computeTrustMetrics(user, getTelemetryHistory());
    const groups = [
      { name: 'East Africa Real Estate Hub', contribution: 200, memberLimit: 20, peerTrust: 94, riskLevel: 'Low' },
      { name: 'Harvest Circle', contribution: 150, memberLimit: 15, peerTrust: 91, riskLevel: 'Balanced' },
      { name: 'Green House Collective', contribution: 300, memberLimit: 18, peerTrust: 97, riskLevel: 'Low' }
    ];

    const cards = groups.map((group) => {
      const score = Math.max(70, Math.min(99, metrics.score - (group.contribution > 250 ? 3 : 0) + Math.round((group.peerTrust - 90) / 2)));
      const recommendation = score >= 92 ? 'Late-cycle placement recommended.' : score >= 84 ? 'Balanced rotation works well.' : 'Use a review lock before approving.';
      return `
        <article class="card p-5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="font-semibold text-[#17362b]">${group.name}</h4>
              <p class="text-sm muted-text mt-1">${group.riskLevel} risk profile</p>
            </div>
            <span class="soft-pill px-3 py-1 rounded-full text-xs font-semibold">${score}/100</span>
          </div>
          <p class="mt-4 text-sm text-[#2e6b4f]">${recommendation}</p>
          <div class="mt-4 flex justify-between text-sm muted-text">
            <span>Contribution: $${group.contribution}</span>
            <span>Limit: ${group.memberLimit}</span>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = cards;
  }

  function renderHomeInsights(user) {
    const metrics = computeTrustMetrics(user, getTelemetryHistory());
    const trustScore = document.getElementById('liveTrustScore');
    const anomalyStatus = document.getElementById('anomalyStatus');
    const forecastSummary = document.getElementById('forecastSummary');
    const insightNote = document.getElementById('insightNote');

    if (trustScore) trustScore.textContent = `${metrics.score}/100`;
    if (anomalyStatus) anomalyStatus.textContent = metrics.anomalyFlag ? 'Review needed' : 'Healthy';
    if (forecastSummary) forecastSummary.textContent = metrics.forecastLabel;
    if (insightNote) insightNote.textContent = metrics.payoutAdvice;
  }

  function renderAdminInsights(user) {
    const container = document.getElementById('adminRiskInsights');
    if (!container) return;

    const metrics = computeTrustMetrics(user, getTelemetryHistory());
    const telemetry = getTelemetryHistory();
    const flagged = telemetry.filter((item) => item.flagged).length;
    const projectedPool = Math.max(500000, (user && user.stats && user.stats.totalSavings) || 0) + (telemetry.length * 125000);

    container.innerHTML = `
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-[#e2d8ca] bg-[#fcfaf6] p-4">
          <p class="text-sm muted-text">Trust score</p>
          <p class="text-xl font-semibold text-[#17362b] mt-1">${metrics.score}/100</p>
        </div>
        <div class="rounded-2xl border border-[#e2d8ca] bg-[#fcfaf6] p-4">
          <p class="text-sm muted-text">Flagged activity</p>
          <p class="text-xl font-semibold text-[#17362b] mt-1">${flagged}</p>
        </div>
        <div class="rounded-2xl border border-[#e2d8ca] bg-[#fcfaf6] p-4">
          <p class="text-sm muted-text">Projected pool</p>
          <p class="text-xl font-semibold text-[#17362b] mt-1">UGX ${projectedPool.toLocaleString()}</p>
        </div>
      </div>
      <p class="mt-4 text-sm text-[#2e6b4f]">${metrics.band}: ${metrics.payoutAdvice}</p>
    `;
  }

  function updateUserTrust(user, telemetryEvents, eventData) {
    const metrics = computeTrustMetrics(user, telemetryEvents);
    const nextUser = {
      ...(user || {}),
      stats: {
        ...(user && user.stats ? user.stats : {}),
        trustScore: metrics.score,
        riskScore: metrics.risk,
        anomalyFlag: metrics.anomalyFlag,
        chartData: Array.isArray((user && user.stats && user.stats.chartData) ? user.stats.chartData : null) ? (user.stats.chartData || []).slice(-5) : [1200, 1800, 1600, 2200, 2800, 3400]
      }
    };

    if (eventData && typeof eventData.amount === 'number') {
      nextUser.stats.totalSavings = (nextUser.stats.totalSavings || 0) + eventData.amount;
    }

    saveUser(nextUser);
    if (window.firebase && window.firebase.firestore) {
      const db = window.firebase.firestore();
      const currentUser = window.firebase.auth().currentUser;
      if (db && currentUser) {
        db.collection('users').doc(currentUser.uid).set({
          stats: nextUser.stats,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    return { user: nextUser, metrics };
  }

  function recordTelemetry(eventData) {
    const telemetryEvents = getTelemetryHistory();
    const storedUser = getStoredUser();
    const createdAt = new Date().toISOString();
    const daysLate = Math.max(0, Number(eventData.daysLate || 0));
    const daysEarly = Math.max(0, Number(eventData.daysEarly || 0));
    const amount = Math.max(0, Number(eventData.amount || 0));
    const event = {
      ...eventData,
      createdAt,
      daysLate,
      daysEarly,
      amount,
      flagged: eventData.flagged || false
    };

    const recentVelocity = telemetryEvents.filter((item) => {
      const createdAtValue = new Date(item.createdAt || Date.now());
      return Date.now() - createdAtValue.getTime() < 10 * 60 * 1000;
    }).length;

    if (amount > 1000000 || recentVelocity >= 2) {
      event.flagged = true;
    }

    telemetryEvents.unshift(event);
    saveTelemetryHistory(telemetryEvents.slice(0, 15));

    if (storedUser) {
      const { user, metrics } = updateUserTrust(storedUser, telemetryEvents, event);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('commisave:profile-updated', { detail: { user, metrics, event } }));
      }
      return { ...metrics, flagged: event.flagged };
    }

    return { score: 95, risk: 5, band: 'Stable', anomalyFlag: event.flagged, forecastLabel: 'Healthy outlook', payoutAdvice: 'Payout order remains balanced.' };
  }

  window.CommiSaveRisk = {
    computeTrustMetrics,
    recordTelemetry,
    renderExploreInsights,
    renderHomeInsights,
    renderAdminInsights,
    getTelemetryHistory
  };

  async function upsertUserProfile(userData) {
    const user = auth && auth.currentUser ? auth.currentUser : null;
    if (!user || !db) return;

    const payload = {
      uid: user.uid,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || user.email || '',
      phone: userData.phone || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      stats: {
        totalSavings: 0,
        activeGroups: 1,
        nextPayout: null,
        trustScore: 95,
        chartData: [1200, 1800, 1600, 2200, 2800, 3400]
      },
      payments: [{
        id: 'default',
        label: 'Mobile money',
        detail: userData.phone || '+256 700 000 000',
        primary: true,
        type: 'mobile'
      }],
      activity: [{
        title: 'Welcome to CommiSave',
        detail: 'Your account is now linked to your dashboard.',
        createdAt: new Date().toISOString()
      }]
    };

    await db.collection('users').doc(user.uid).set(payload, { merge: true });
    saveUser({ uid: user.uid, ...payload });
  }

  async function loadUserProfile() {
    const user = auth && auth.currentUser ? auth.currentUser : null;
    if (!user || !db) return getStoredUser();

    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      saveUser({ uid: user.uid, ...data });
      return { uid: user.uid, ...data };
    }

    return getStoredUser();
  }

  function applyProfile(user) {
    if (!user) return;

    const fullName = buildFullName(user);
    const email = user.email || 'Add your email';
    const phone = user.phone || 'Add your phone';

    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) welcomeName.textContent = `${user.firstName || 'Friend'}, your savings are growing.`;

    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = fullName;

    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = email;

    const profilePhone = document.getElementById('profilePhone');
    if (profilePhone) profilePhone.textContent = phone;

    const avatar = document.getElementById('avatarImage');
    if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1f4d3a&color=fff`;

    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=128&background=1f4d3a&color=fff`;

    const personalDataList = document.getElementById('personalDataList');
    if (personalDataList) {
      const joinedDate = user.createdAt ? formatDate(user.createdAt) : 'Recently joined';
      personalDataList.innerHTML = `
        <div class="card p-4">
          <p class="text-sm muted-text">First name</p>
          <p class="font-semibold text-[#17362b] mt-1">${user.firstName || '—'}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm muted-text">Last name</p>
          <p class="font-semibold text-[#17362b] mt-1">${user.lastName || '—'}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm muted-text">Email</p>
          <p class="font-semibold text-[#17362b] mt-1">${email}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm muted-text">Phone</p>
          <p class="font-semibold text-[#17362b] mt-1">${phone}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm muted-text">Member since</p>
          <p class="font-semibold text-[#17362b] mt-1">${joinedDate}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm muted-text">Account status</p>
          <p class="font-semibold text-[#17362b] mt-1">Active</p>
        </div>
      `;
    }
  }

  function populateEditForm(user) {
    if (!user) return;
    const firstNameField = document.getElementById('editFirstName');
    const lastNameField = document.getElementById('editLastName');
    const emailField = document.getElementById('editEmail');
    const phoneField = document.getElementById('editPhone');

    if (firstNameField) firstNameField.value = user.firstName || '';
    if (lastNameField) lastNameField.value = user.lastName || '';
    if (emailField) emailField.value = user.email || '';
    if (phoneField) phoneField.value = user.phone || '';
  }

  function toggleEditForm(show) {
    const formCard = document.getElementById('profileEditFormCard');
    if (formCard) formCard.classList.toggle('hidden', !show);
  }

  async function saveProfileFromForm(user) {
    const form = document.getElementById('profileEditForm');
    if (!form) return user;

    const updatedUser = {
      ...user,
      firstName: document.getElementById('editFirstName').value.trim(),
      lastName: document.getElementById('editLastName').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      updatedAt: new Date().toISOString()
    };

    saveUser(updatedUser);

    const currentUser = auth && auth.currentUser ? auth.currentUser : null;
    if (db && currentUser) {
      await db.collection('users').doc(currentUser.uid).set({
        ...updatedUser,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    applyProfile(updatedUser);
    await renderDashboard(updatedUser);
    toggleEditForm(false);
    return updatedUser;
  }

  async function renderDashboard(user) {
    if (!user) return;

    const metrics = computeTrustMetrics(user, getTelemetryHistory());
    const stats = user.stats || {};
    const totalSavings = document.getElementById('totalSavings');
    if (totalSavings) totalSavings.textContent = formatCurrency(stats.totalSavings || 0);

    const activeGroups = document.getElementById('activeGroups');
    if (activeGroups) activeGroups.textContent = stats.activeGroups || 0;

    const nextPayout = document.getElementById('nextPayout');
    if (nextPayout) nextPayout.textContent = formatDate(stats.nextPayout);

    const payoutReady = document.getElementById('payoutReady');
    if (payoutReady) payoutReady.textContent = formatCurrency(stats.totalSavings || 0);

    const joinedGroups = document.getElementById('joinedGroups');
    if (joinedGroups) joinedGroups.textContent = stats.activeGroups || 0;

    const trustScore = document.getElementById('trustScore');
    if (trustScore) trustScore.textContent = `${metrics.score}/100`;

    const activityList = document.getElementById('activityList');
    if (activityList) {
      const items = (user.activity || []).slice(0, 3);
      activityList.innerHTML = items.map(item => `
        <div class="card p-4">
          <p class="font-semibold">${item.title}</p>
          <p class="muted-text text-sm mt-1">${item.detail}</p>
        </div>
      `).join('');
    }

    const miniSavings = document.getElementById('miniSavings');
    if (miniSavings) miniSavings.textContent = formatCurrency(stats.totalSavings || 0);

    const miniPayout = document.getElementById('miniPayout');
    if (miniPayout) miniPayout.textContent = formatCurrency(Math.round((stats.totalSavings || 0) * 0.2));

    const miniGoal = document.getElementById('miniGoal');
    if (miniGoal) miniGoal.textContent = formatCurrency((stats.totalSavings || 0) + 3000);

    const progressAmount = document.getElementById('progressAmount');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    const currentBalance = document.getElementById('currentBalance');
    const targetBalance = document.getElementById('targetBalance');
    const nextPayoutProfile = document.getElementById('nextPayoutProfile');

    const currentValue = stats.totalSavings || 0;
    const targetValue = user.targetBalance || 15000;
    const percent = Math.min(100, Math.round((currentValue / targetValue) * 100));
    if (progressAmount) progressAmount.textContent = formatCurrency(currentValue);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${percent}% of your target reached`;
    if (currentBalance) currentBalance.textContent = formatCurrency(currentValue);
    if (targetBalance) targetBalance.textContent = formatCurrency(targetValue);
    if (nextPayoutProfile) nextPayoutProfile.textContent = formatDate(stats.nextPayout);

    const paymentMethodsList = document.getElementById('paymentMethodsList');
    if (paymentMethodsList) {
      const payments = user.payments || [];
      paymentMethodsList.innerHTML = payments.map(method => `
        <div class="card p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl ${method.type === 'card' ? 'bg-[#2e6b4f] text-white' : 'bg-[#f2db6d] text-[#17362b]'} flex items-center justify-center text-xs font-bold">${method.type === 'card' ? '💳' : 'MM'}</div>
            <div>
              <p class="font-semibold text-[#17362b]">${method.label}</p>
              <p class="text-sm muted-text">${method.detail}</p>
            </div>
          </div>
          ${method.primary ? '<span class="soft-pill px-3 py-1 rounded-full text-sm font-semibold">Primary</span>' : ''}
        </div>
      `).join('');
    }

    const chartCanvas = document.getElementById('growthChart');
    if (chartCanvas) {
      const existingChart = Chart.getChart(chartCanvas);
      if (existingChart) existingChart.destroy();
      const ctx = chartCanvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Savings $',
            data: stats.chartData || [1200, 1800, 1600, 2200, 2800, 3400],
            borderColor: '#2e6b4f',
            backgroundColor: 'rgba(46, 107, 79, 0.16)',
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#1f4d3a'
          }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const editProfileToggle = document.getElementById('editProfileToggle');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const cancelEditAction = document.getElementById('cancelEditAction');
    const profileEditForm = document.getElementById('profileEditForm');

    if (editProfileToggle) {
      editProfileToggle.addEventListener('click', function () {
        const storedUser = getStoredUser();
        if (storedUser) populateEditForm(storedUser);
        toggleEditForm(true);
      });
    }

    [cancelEditBtn, cancelEditAction].forEach((button) => {
      if (button) button.addEventListener('click', () => toggleEditForm(false));
    });

    if (profileEditForm) {
      profileEditForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const current = getStoredUser();
        if (!current) return;
        await saveProfileFromForm(current);
      });
    }

    renderExploreInsights(getStoredUser());
    renderHomeInsights(getStoredUser());
    renderAdminInsights(getStoredUser());

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const firstName = loginForm.firstName.value.trim();
        const lastName = loginForm.lastName.value.trim();
        const email = loginForm.email.value.trim();
        const phone = loginForm.phone.value.trim();
        const password = document.getElementById('passwordInput').value;

        if (!auth) {
          saveUser({ firstName, lastName, email, phone });
          window.location.href = 'home.html';
          return;
        }

        try {
          const userCredential = await auth.createUserWithEmailAndPassword(email, password);
          await upsertUserProfile({ firstName, lastName, email, phone });
          window.location.href = 'home.html';
        } catch (error) {
          alert(error.message);
        }
      });
    }

    if (auth) {
      auth.onAuthStateChanged(async function (user) {
        if (!user) {
          const localUser = getStoredUser();
          if (localUser) {
            applyProfile(localUser);
            await renderDashboard(localUser);
            renderExploreInsights(localUser);
            renderHomeInsights(localUser);
            renderAdminInsights(localUser);
          }
          return;
        }

        const profile = await loadUserProfile();
        applyProfile(profile);
        await renderDashboard(profile);
        renderExploreInsights(profile);
        renderHomeInsights(profile);
        renderAdminInsights(profile);
      });
    } else {
      const localUser = getStoredUser();
      if (localUser) {
        applyProfile(localUser);
        await renderDashboard(localUser);
      }
    }
  });
})();
