importScripts('storage.js');

// ─── Constants ───────────────────────────────────────────────────────────────

const ALARM_NAME = 'site-tracker-tick';
const THRESHOLD_ALARM_PREFIX = 'threshold-trigger-';
const pendingTimeouts = {}; // hostname → timeout ID

// ─── Serialize all session-state mutations ───────────────────────────────────
// Every event handler below reads-modifies-writes chrome.storage.session, and
// those operations aren't atomic. Chrome fires handlers concurrently, so an
// alarm tick landing mid tab-switch can clobber the other's write — dropped
// elapsed seconds, a popupShown flag that never sticks. Chaining each handler
// onto a single promise guarantees they run one at a time. Internal helpers
// (checkThreshold, updateActiveTab, …) must NOT call runExclusive themselves, or
// they'd deadlock against the handler that already holds the lock.

let stateLock = Promise.resolve();

function runExclusive(fn) {
    const run = stateLock.then(fn, fn);
    stateLock = run.then(() => {}, () => {}); // keep the chain alive past errors
    return run;
}

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
    // Advance by exactly the whole seconds we counted, not to `now`, so the
    // sub-second remainder carries into the next flush instead of being lost.
    // (Flushing to `now` on every event made the timer drift slow.)
    const newLastActive = state.lastActiveTime + delta * 1000;
    await setSessionState({ elapsed, lastActiveTime: newLastActive });
    console.log(`[TimeNudge] flushElapsed: +${delta}s for ${state.activeHostname} → total ${elapsed[state.activeHostname]}s`);
    return { ...state, elapsed, lastActiveTime: newLastActive };
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
        const hostname = normalizeHostname(new URL(tab.url).hostname);
        const state = await getSessionState();

        // Always bank the time accrued so far before moving lastActiveTime
        // forward. flushElapsed attributes it to the OLD activeHostname, so it's
        // correct whether or not the hostname changes — and it's what keeps a
        // switch between two tabs of the SAME domain from dropping the
        // un-flushed seconds (we'd reset lastActiveTime below either way).
        await flushElapsed(state);

        if (hostname !== state.activeHostname) {
            console.log(`[TimeNudge] updateActiveTab: switched from ${state.activeHostname} → ${hostname}`);
            // Tear down any schedule armed for the site we're leaving so it
            // doesn't fire a stray wakeup later.
            if (state.activeHostname) {
                clearTimeout(pendingTimeouts[state.activeHostname]);
                delete pendingTimeouts[state.activeHostname];
                chrome.alarms.clear(THRESHOLD_ALARM_PREFIX + state.activeHostname);
            }
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

chrome.tabs.onActivated.addListener(() => runExclusive(async () => {
    console.log('[TimeNudge] Event: tab activated');
    await updateActiveTab();
    await checkThreshold('tab-activated');
}));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== 'complete') return;
    return runExclusive(async () => {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id === tabId) {
            console.log('[TimeNudge] Event: tab updated (navigation complete)');
            await updateActiveTab();
            await checkThreshold('tab-updated');
        }
    });
});

chrome.windows.onFocusChanged.addListener((windowId) => runExclusive(async () => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        console.log('[TimeNudge] Event: window lost focus, pausing timer');
        const state = await getSessionState();
        await flushElapsed(state);
        await setSessionState({ windowFocused: false, lastActiveTime: null });
    } else {
        console.log('[TimeNudge] Event: window gained focus, resuming timer');
        await setSessionState({ windowFocused: true, lastActiveTime: Date.now() });
        await updateActiveTab();
        await checkThreshold('focus-gain');
    }
}));

// ─── Multi-tab helpers ───────────────────────────────────────────────────────

// All tabs (across every window) whose normalized hostname matches. Time is
// tracked per-hostname, so a nudge applies to every open tab of that site.
async function getTabsForHostname(hostname) {
    const tabs = await chrome.tabs.query({});
    return tabs.filter((tab) => {
        if (!tab.url || tab.id == null) return false;
        try {
            return normalizeHostname(new URL(tab.url).hostname) === hostname;
        } catch {
            return false;
        }
    });
}

// Tear down the overlay on every tab of a hostname (dismiss-on-one = dismiss-on-all).
async function hideOverlaysForHostname(hostname) {
    const tabs = await getTabsForHostname(hostname);
    console.log(`[TimeNudge] hideOverlaysForHostname: hiding overlay on ${tabs.length} tab(s) of ${hostname}`);
    for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'HIDE_OVERLAY' }).catch(() => {});
    }
}

// ─── Send popup message with content script injection fallback ───────────────

// force=true rebuilds the overlay (fresh problem) — used when a nudge first
// fires. force=false only shows it if the tab doesn't already have one — used
// to catch up tabs that opened/navigated in after the initial broadcast, so a
// half-typed answer is never wiped.
async function sendPopupMessage(tabId, hostname, force = true) {
    const difficulty = await getDifficulty();
    const payload = { type: 'SHOW_POPUP', hostname, difficulty, force };
    console.log(`[TimeNudge] sendPopupMessage: sending SHOW_POPUP to tab ${tabId} for ${hostname} (difficulty: ${difficulty}, force: ${force})`);
    chrome.tabs.sendMessage(tabId, payload, () => {
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
                    chrome.tabs.sendMessage(tabId, payload, () => {
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

// ─── Threshold check (used by alarm and focus-gain) ──────────────────────────

async function checkThreshold(source) {
    const state = await getSessionState();
    if (!state.windowFocused || !state.activeHostname) {
        console.log(`[TimeNudge] checkThreshold (${source}): skipped (window not focused or no active hostname)`);
        return;
    }

    const { trackedSites } = await getSettings();
    const hostname = state.activeHostname;

    if (!trackedSites.includes(hostname)) {
        console.log(`[TimeNudge] checkThreshold (${source}): ${hostname} not tracked`);
        return;
    }

    const flushed = await flushElapsed(state);
    const elapsed = flushed.elapsed[hostname] || 0;
    const threshold = await getThreshold(hostname);

    console.log(`[TimeNudge] checkThreshold (${source}): ${hostname} — counting ${elapsed}s / threshold ${threshold}s (${Math.round((elapsed / threshold) * 100)}%)`);

    if (elapsed >= threshold && !flushed.popupShown[hostname]) {
        clearTimeout(pendingTimeouts[hostname]);
        delete pendingTimeouts[hostname];
        const tabs = await getTabsForHostname(hostname);
        console.log(`[TimeNudge] checkThreshold (${source}): threshold reached for ${hostname}, showing popup on ${tabs.length} tab(s)`);
        if (tabs.length > 0) {
            for (const tab of tabs) {
                await sendPopupMessage(tab.id, hostname, true);
            }
            const popupShown = { ...flushed.popupShown, [hostname]: true };
            await setSessionState({ popupShown });
        } else {
            console.warn(`[TimeNudge] checkThreshold (${source}): no tab found for ${hostname}`);
        }
    } else if (elapsed >= threshold) {
        // Nudge already firing for this hostname. Make sure the active tab shows
        // the overlay too — covers tabs opened, navigated in, or reloaded after
        // the initial broadcast (closes the "reload to escape" gap). force=false
        // leaves an overlay that's already up untouched.
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id != null) {
            await sendPopupMessage(tab.id, hostname, false);
        }
    } else {
        const remaining = threshold - elapsed;
        if (remaining < 30) {
            clearTimeout(pendingTimeouts[hostname]);
            console.log(`[TimeNudge] checkThreshold (${source}): scheduling setTimeout in ${remaining}s (short threshold)`);
            pendingTimeouts[hostname] = setTimeout(() => runExclusive(() => checkThreshold('timeout')), remaining * 1000);
        } else {
            const alarmName = THRESHOLD_ALARM_PREFIX + hostname;
            console.log(`[TimeNudge] checkThreshold (${source}): scheduling one-shot alarm in ${remaining}s`);
            chrome.alarms.create(alarmName, { delayInMinutes: remaining / 60 });
        }
    }
}

// ─── Alarm tick: check elapsed time ──────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        return runExclusive(() => checkThreshold('alarm'));
    } else if (alarm.name.startsWith(THRESHOLD_ALARM_PREFIX)) {
        return runExclusive(() => checkThreshold('threshold-alarm'));
    }
});

// ─── Handle DISMISS_POPUP from content script ────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'HIDE_ALL_OVERLAYS') {
        // Fired by the popup when a site is removed or its duration retuned, so
        // any visible overlay is cleared on every tab of that hostname, not just
        // the active one. No state mutation, so no lock needed.
        if (message.hostname) hideOverlaysForHostname(message.hostname);
        return;
    }
    if (message.type === 'THRESHOLD_CHANGED') {
        const hostname = message.hostname;
        runExclusive(async () => {
            console.log(`[TimeNudge] THRESHOLD_CHANGED received for ${hostname}, re-evaluating (elapsed kept)`);
            if (!hostname) return;
            // Drop the stale schedule (it was armed against the old threshold).
            clearTimeout(pendingTimeouts[hostname]);
            delete pendingTimeouts[hostname];
            chrome.alarms.clear(THRESHOLD_ALARM_PREFIX + hostname);

            // Bank time so far, then compare against the NEW threshold — without
            // wiping elapsed. If the user raised the limit back above their
            // current time while a nudge was showing, take it down (checkThreshold
            // only ever *sets* popupShown, so it can't clear it itself).
            const state = await flushElapsed(await getSessionState());
            const elapsed = state.elapsed[hostname] || 0;
            const threshold = await getThreshold(hostname);
            if (elapsed < threshold && state.popupShown[hostname]) {
                const popupShown = { ...state.popupShown };
                delete popupShown[hostname];
                await setSessionState({ popupShown });
                await hideOverlaysForHostname(hostname);
            }
            await checkThreshold('threshold-changed');
        });
        return;
    }
    if (message.type === 'DISMISS_POPUP') {
        const hostname = message.hostname;
        runExclusive(async () => {
            console.log(`[TimeNudge] DISMISS_POPUP received for ${hostname}, resetting timer`);
            clearTimeout(pendingTimeouts[hostname]);
            delete pendingTimeouts[hostname];
            const state = await getSessionState();
            const elapsed = { ...state.elapsed };
            const popupShown = { ...state.popupShown };
            delete elapsed[hostname];
            delete popupShown[hostname];
            await setSessionState({ elapsed, popupShown, lastActiveTime: Date.now() });
            // Solving on one tab clears the overlay on every tab of this site.
            await hideOverlaysForHostname(hostname);
            await checkThreshold('dismiss-reset');
        });
    }
});
