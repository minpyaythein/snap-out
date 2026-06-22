const siteList = document.getElementById('site-list');
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

// Load on open
getSettings().then(({ trackedSites, difficultyLevel }) => {
    renderList(trackedSites);
    difficultySelect.value = difficultyLevel || 'hard';
});
