const siteList = document.getElementById('site-list');
const sessionTimer = document.getElementById('session-timer');
const sessionHostname = document.getElementById('session-hostname');
const sessionElapsed = document.getElementById('session-elapsed');

async function updateSessionTimer() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        sessionTimer.classList.add('hidden');
        return;
    }

    let hostname;
    try {
        hostname = normalizeHostname(new URL(tab.url).hostname);
    } catch {
        sessionTimer.classList.add('hidden');
        return;
    }

    const { trackedSites } = await getSettings();
    if (!trackedSites.includes(hostname)) {
        sessionTimer.classList.add('hidden');
        return;
    }

    const session = await chrome.storage.session.get({ elapsed: {}, lastActiveTime: null, activeHostname: null, windowFocused: true });
    const storedElapsed = session.elapsed[hostname] || 0;
    // Only add the un-flushed live time when this is the site actually being
    // tracked right now (active tab + focused window), otherwise it's paused.
    const isLive = session.windowFocused && session.activeHostname === hostname && session.lastActiveTime;
    const liveExtra = isLive ? Math.floor((Date.now() - session.lastActiveTime) / 1000) : 0;
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

            // Clear elapsed and popupShown for the removed site
            const session = await chrome.storage.session.get({ elapsed: {}, popupShown: {} });
            const elapsed = { ...session.elapsed };
            const popupShown = { ...session.popupShown };
            delete elapsed[hostname];
            delete popupShown[hostname];
            await chrome.storage.session.set({ elapsed, popupShown, lastActiveTime: Date.now() });

            // Hide the overlay on every tab of this site, not just the active one.
            chrome.runtime.sendMessage({ type: 'HIDE_ALL_OVERLAYS', hostname });

            const { trackedSites } = await getSettings();
            renderList(trackedSites);
            updateSessionTimer();
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

    // Strip protocol and www.
    const hostname = normalizeHostname(raw.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));

    const { trackedSites } = await getSettings();
    if (trackedSites.includes(hostname)) {
        showError(`${hostname} is already tracked.`);
        return;
    }

    await addSite(hostname);
    siteInput.value = '';

    // Reset elapsed counter so tracking starts fresh from now
    const session = await chrome.storage.session.get({ elapsed: {}, popupShown: {} });
    const elapsed = { ...session.elapsed };
    const popupShown = { ...session.popupShown };
    delete elapsed[hostname];
    delete popupShown[hostname];
    await chrome.storage.session.set({ elapsed, popupShown, lastActiveTime: Date.now() });

    const updated = await getSettings();
    renderList(updated.trackedSites);
    updateSessionTimer();
});

const difficultySelect = document.getElementById('difficulty-select');

difficultySelect.addEventListener('change', async () => {
    await saveDifficulty(difficultySelect.value);
});

const durationMin = document.getElementById('duration-min');
const durationSec = document.getElementById('duration-sec');
const durationCurrent = document.getElementById('duration-current');

// Reject any inserted text (typing or paste) that isn't a digit, so the fields
// can never hold `e`, `.`, `-`, etc. that a number input would otherwise allow.
function blockNonDigits(e) {
    if (e.data != null && /\D/.test(e.data)) e.preventDefault();
}

// Clamp live: minutes 0–30, seconds 0–59, and 30 min is the overall cap (so at
// 30 minutes the seconds are forced to 0). Empty mid-edit is left alone.
function clampDurationInputs() {
    let mins = parseInt(durationMin.value, 10);
    if (!Number.isNaN(mins)) {
        if (mins > 30) mins = 30;
        if (mins < 0) mins = 0;
        durationMin.value = mins;
    }

    let secs = parseInt(durationSec.value, 10);
    if (!Number.isNaN(secs)) {
        const secMax = mins >= 30 ? 0 : 59;
        if (secs > secMax) secs = secMax;
        if (secs < 0) secs = 0;
        durationSec.value = secs;
    }
}

durationMin.addEventListener('beforeinput', blockNonDigits);
durationSec.addEventListener('beforeinput', blockNonDigits);
durationMin.addEventListener('input', clampDurationInputs);
durationSec.addEventListener('input', clampDurationInputs);

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const MAX_DURATION = 1800; // 30 minutes
const MIN_DURATION = 10;   // 10 seconds

async function saveDuration() {
    let mins = parseInt(durationMin.value, 10) || 0;
    let secs = parseInt(durationSec.value, 10) || 0;
    if (mins < 0) mins = 0;
    if (secs < 0) secs = 0;
    if (secs > 59) secs = 59;

    let total = mins * 60 + secs;
    total = Math.min(MAX_DURATION, Math.max(MIN_DURATION, total));

    // Reflect the normalized value back into the inputs.
    durationMin.value = Math.floor(total / 60);
    durationSec.value = total % 60;

    console.log(`[TimeNudge] popup: saving duration → ${total}s`);
    await saveDefaultThreshold(total);
    durationCurrent.textContent = formatDuration(total);

    // Apply the new limit to the active site WITHOUT wiping accumulated time.
    // The background re-evaluates against the new threshold: if you're already
    // over it you get nudged now; if you raised it back above your current time
    // any showing nudge clears and the timer keeps running.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
        try {
            const hostname = normalizeHostname(new URL(tab.url).hostname);
            console.log(`[TimeNudge] popup: threshold changed → ${total}s, re-evaluating ${hostname}`);
            chrome.runtime.sendMessage({ type: 'THRESHOLD_CHANGED', hostname });
        } catch {
            // non-http tab, ignore
        }
    }
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
