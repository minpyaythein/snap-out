const DEFAULT_THRESHOLD = 30; // seconds

async function getSettings() {
    const result = await chrome.storage.sync.get({ trackedSites: [], thresholds: {}, difficultyLevel: 'hard' });
    return result;
}

async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
}

async function getThreshold(hostname) {
    const { thresholds } = await getSettings();
    return thresholds[hostname] ?? DEFAULT_THRESHOLD;
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
