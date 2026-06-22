const DEFAULT_THRESHOLD = 300; // seconds (fallback when no defaultThreshold in storage)

function normalizeHostname(hostname) {
    return hostname.replace(/^www\./, '');
}

async function getSettings() {
    const result = await chrome.storage.sync.get({ trackedSites: [], thresholds: {}, difficultyLevel: 'hard', defaultThreshold: null });
    result.trackedSites = [...new Set(result.trackedSites.map(normalizeHostname))];
    return result;
}

async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
}

async function getThreshold(hostname) {
    const { thresholds, defaultThreshold } = await getSettings();
    if (thresholds[hostname] != null) {
        console.log(`[TimeNudge] getThreshold(${hostname}): using per-site override → ${thresholds[hostname]}s`);
        return thresholds[hostname];
    }
    if (defaultThreshold != null) {
        console.log(`[TimeNudge] getThreshold(${hostname}): using defaultThreshold → ${defaultThreshold}s`);
        return defaultThreshold;
    }
    console.log(`[TimeNudge] getThreshold(${hostname}): no saved threshold, using hardcoded default → ${DEFAULT_THRESHOLD}s`);
    return DEFAULT_THRESHOLD;
}

async function saveDefaultThreshold(seconds) {
    await chrome.storage.sync.set({ defaultThreshold: seconds });
    console.log(`[TimeNudge] saveDefaultThreshold: saved ${seconds}s`);
}

async function getDifficulty() {
    const { difficultyLevel } = await getSettings();
    return difficultyLevel;
}

async function saveDifficulty(level) {
    await chrome.storage.sync.set({ difficultyLevel: level });
}

async function addSite(hostname) {
    const settings = await getSettings();
    if (!settings.trackedSites.includes(hostname)) {
        settings.trackedSites.push(hostname);
        await saveSettings(settings);
    }
}

async function removeSite(hostname) {
    const settings = await getSettings();
    settings.trackedSites = settings.trackedSites.filter(s => s !== hostname);
    delete settings.thresholds[hostname];
    await saveSettings(settings);
}
