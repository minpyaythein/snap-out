const siteList = document.getElementById('site-list');
const sessionTimer = document.getElementById('session-timer');
const sessionHostname = document.getElementById('session-hostname');
const sessionElapsed = document.getElementById('session-elapsed');

async function updateSessionTimer() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    let hostname;
    try {
        hostname = new URL(tab.url).hostname;
    } catch {
        return;
    }

    const { trackedSites } = await getSettings();
    if (!trackedSites.includes(hostname)) {
        sessionTimer.classList.add('hidden');
        return;
    }

    const session = await chrome.storage.session.get({ elapsed: {}, lastActiveTime: null });
    const storedElapsed = session.elapsed[hostname] || 0;
    const liveExtra = session.lastActiveTime ? Math.floor((Date.now() - session.lastActiveTime) / 1000) : 0;
    const elapsed = storedElapsed + liveExtra;
    const threshold = await getThreshold(hostname);

    sessionHostname.textContent = hostname;
    sessionElapsed.textContent = `${elapsed}s / ${threshold}s`;
    sessionTimer.classList.remove('hidden');
}

updateSessionTimer();
setInterval(updateSessionTimer, 1000);

const addForm = document.getElementById('add-form');
const siteInput = document.getElementById('site-input');
const errorMsg = document.getElementById('error-msg');

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.add('hidden');
}

function renderList(sites) {
    siteList.innerHTML = '';
    if (sites.length === 0) {
        siteList.innerHTML = '<li class="empty">No sites tracked yet.</li>';
        return;
    }
    sites.forEach(hostname => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="hostname">${hostname}</span>
            <button class="remove-btn" data-hostname="${hostname}" title="Remove">✕</button>
        `;
        li.querySelector('.remove-btn').addEventListener('click', async () => {
            await removeSite(hostname);
            const { trackedSites } = await getSettings();
            renderList(trackedSites);
        });
        siteList.appendChild(li);
    });
}

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const raw = siteInput.value.trim().toLowerCase();
    if (!raw) {
        showError('Please enter a hostname.');
        return;
    }

    // Strip protocol if user accidentally typed it
    const hostname = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const { trackedSites } = await getSettings();
    if (trackedSites.includes(hostname)) {
        showError(`${hostname} is already tracked.`);
        return;
    }

    await addSite(hostname);
    siteInput.value = '';
    const updated = await getSettings();
    renderList(updated.trackedSites);
});

const difficultySelect = document.getElementById('difficulty-select');

difficultySelect.addEventListener('change', async () => {
    await saveDifficulty(difficultySelect.value);
});

const durationMin = document.getElementById('duration-min');
const durationSec = document.getElementById('duration-sec');
const durationCurrent = document.getElementById('duration-current');

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

async function saveDuration() {
    let mins = parseInt(durationMin.value, 10) || 0;
    let secs = parseInt(durationSec.value, 10) || 0;

    if (mins >= 30) {
        mins = 30;
        secs = 0;
        durationMin.value = 30;
        durationSec.value = 0;
    }

    let total = mins * 60 + secs;
    if (total < 10) {
        total = 10;
        durationMin.value = 0;
        durationSec.value = 10;
    }

    console.log(`[TimeNudge] popup: saving duration → ${total}s (${mins}m ${secs}s)`);
    await saveDefaultThreshold(total);
    durationCurrent.textContent = formatDuration(total);
}

const durationApply = document.getElementById('duration-apply');
durationApply.addEventListener('click', async () => {
    await saveDuration();
    durationApply.textContent = '✓';
    durationApply.classList.add('applied');
    setTimeout(() => {
        durationApply.textContent = 'Apply';
        durationApply.classList.remove('applied');
    }, 1200);
});

// Load on open
getSettings().then(({ trackedSites, difficultyLevel, defaultThreshold }) => {
    renderList(trackedSites);
    difficultySelect.value = difficultyLevel || 'hard';

    const threshold = defaultThreshold ?? 300;
    console.log(`[TimeNudge] popup: loaded threshold → ${threshold}s (raw stored value: ${defaultThreshold})`);
    durationMin.value = Math.floor(threshold / 60);
    durationSec.value = threshold % 60;
    durationCurrent.textContent = formatDuration(threshold);
});
