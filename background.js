importScripts('storage.js');

// ─── Constants ───────────────────────────────────────────────────────────────

const ALARM_NAME = 'site-tracker-tick';

// ─── Session state (survives SW restarts within same browser session) ─────────

async function getSessionState() {
    const result = await chrome.storage.session.get({
        activeHostname: null,
        windowFocused: true,
        elapsed: {},
        lastActiveTime: null,
        popupShown: {}
    });
    return result;
}

async function setSessionState(partial) {
    await chrome.storage.session.set(partial);
}

// ─── Install: initialise default storage ─────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
    console.log('[TimeNudge] Extension installed/updated');
    const existing = await chrome.storage.sync.get({ trackedSites: null });
    if (existing.trackedSites === null) {
        await chrome.storage.sync.set({ trackedSites: [], thresholds: {} });
        console.log('[TimeNudge] Default storage initialised');
    }
    startAlarm();
});

// ─── Alarm setup ─────────────────────────────────────────────────────────────

function startAlarm() {
    chrome.alarms.get(ALARM_NAME, (alarm) => {
        if (!alarm) {
            chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
            console.log('[TimeNudge] Alarm created (30s interval)');
        } else {
            console.log('[TimeNudge] Alarm already exists, skipping create');
        }
    });
}

startAlarm();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function flushElapsed(state) {
    if (!state.lastActiveTime || !state.activeHostname) {
        console.log('[TimeNudge] flushElapsed: skipped (no active time or hostname)');
        return state;
    }

    const { trackedSites } = await getSettings();
    if (!trackedSites.includes(state.activeHostname)) {
        console.log(`[TimeNudge] flushElapsed: skipped (${state.activeHostname} not tracked)`);
        await setSessionState({ lastActiveTime: Date.now() });
        return { ...state, lastActiveTime: Date.now() };
    }

    const now = Date.now();
    const delta = Math.floor((now - state.lastActiveTime) / 1000);
    if (delta <= 0) return state;

    const elapsed = { ...state.elapsed };
    elapsed[state.activeHostname] = (elapsed[state.activeHostname] || 0) + delta;
    await setSessionState({ elapsed, lastActiveTime: now });
    console.log(`[TimeNudge] flushElapsed: +${delta}s for ${state.activeHostname} → total ${elapsed[state.activeHostname]}s`);
    return { ...state, elapsed, lastActiveTime: now };
}

// ─── Track active hostname ────────────────────────────────────────────────────

async function updateActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        console.log('[TimeNudge] updateActiveTab: no active tab or URL, pausing');
        await pauseTracking();
        return;
    }
    try {
        const hostname = new URL(tab.url).hostname;
        const state = await getSessionState();

        if (hostname !== state.activeHostname) {
            console.log(`[TimeNudge] updateActiveTab: switched from ${state.activeHostname} → ${hostname}`);
            await flushElapsed(state);
        }

        await setSessionState({
            activeHostname: hostname,
            lastActiveTime: Date.now()
        });
        console.log(`[TimeNudge] updateActiveTab: now tracking ${hostname}`);
    } catch (err) {
        console.log('[TimeNudge] updateActiveTab: error parsing URL, pausing', err);
        await pauseTracking();
    }
}

async function pauseTracking() {
    console.log('[TimeNudge] pauseTracking: flushing and pausing timer');
    const state = await getSessionState();
    await flushElapsed(state);
    await setSessionState({ activeHostname: null, lastActiveTime: null });
}

chrome.tabs.onActivated.addListener(async () => {
    console.log('[TimeNudge] Event: tab activated');
    await updateActiveTab();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id === tabId) {
            console.log('[TimeNudge] Event: tab updated (navigation complete)');
            await updateActiveTab();
        }
    }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        console.log('[TimeNudge] Event: window lost focus, pausing timer');
        const state = await getSessionState();
        await flushElapsed(state);
        await setSessionState({ windowFocused: false, lastActiveTime: null });
    } else {
        console.log('[TimeNudge] Event: window gained focus, resuming timer');
        await setSessionState({ windowFocused: true, lastActiveTime: Date.now() });
        await updateActiveTab();
    }
});

// ─── Send popup message with content script injection fallback ───────────────

async function sendPopupMessage(tabId, hostname) {
    const difficulty = await getDifficulty();
    console.log(`[TimeNudge] sendPopupMessage: sending SHOW_POPUP to tab ${tabId} for ${hostname} (difficulty: ${difficulty})`);
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_POPUP', hostname, difficulty }, () => {
        if (!chrome.runtime.lastError) {
            console.log('[TimeNudge] sendPopupMessage: message delivered successfully');
            return;
        }

        console.warn('[TimeNudge] sendPopupMessage: content script missing, injecting manually...', chrome.runtime.lastError.message);
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
            .then(() => chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] }))
            .then(() => {
                console.log('[TimeNudge] sendPopupMessage: content script injected, retrying...');
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: 'SHOW_POPUP', hostname, difficulty }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('[TimeNudge] sendPopupMessage: retry failed', chrome.runtime.lastError.message);
                        } else {
                            console.log('[TimeNudge] sendPopupMessage: retry delivered successfully');
                        }
                    });
                }, 100);
            })
            .catch((err) => {
                console.error('[TimeNudge] sendPopupMessage: failed to inject content script', err);
            });
    });
}

// ─── Alarm tick: check elapsed time ──────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    const state = await getSessionState();
    if (!state.windowFocused || !state.activeHostname) {
        console.log('[TimeNudge] Alarm tick: skipped (window not focused or no active hostname)');
        return;
    }

    const { trackedSites, thresholds } = await getSettings();
    const hostname = state.activeHostname;

    if (!trackedSites.includes(hostname)) {
        console.log(`[TimeNudge] Alarm tick: ${hostname} is not in tracked list, resetting lastActiveTime`);
        await setSessionState({ lastActiveTime: Date.now() });
        return;
    }

    const flushed = await flushElapsed(state);
    const elapsed = flushed.elapsed[hostname] || 0;
    const threshold = thresholds[hostname] ?? DEFAULT_THRESHOLD;

    console.log(`[TimeNudge] Alarm tick: ${hostname} — ${elapsed}s / ${threshold}s`);

    if (elapsed >= threshold && !flushed.popupShown[hostname]) {
        console.log(`[TimeNudge] Alarm tick: threshold reached for ${hostname}, showing popup`);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await sendPopupMessage(tab.id, hostname);
            const popupShown = { ...flushed.popupShown, [hostname]: true };
            await setSessionState({ popupShown });
        } else {
            console.warn('[TimeNudge] Alarm tick: no active tab found to send popup');
        }
    }
});

// ─── Handle DISMISS_POPUP from content script ────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'DISMISS_POPUP') {
        console.log(`[TimeNudge] DISMISS_POPUP received for ${message.hostname}, resetting timer`);
        getSessionState().then(state => {
            const elapsed = { ...state.elapsed };
            const popupShown = { ...state.popupShown };
            delete elapsed[message.hostname];
            delete popupShown[message.hostname];
            setSessionState({ elapsed, popupShown, lastActiveTime: Date.now() });
        });
    }
});
