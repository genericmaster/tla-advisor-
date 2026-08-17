// ─── Sidebar toggle ─────────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ─── Logout ─────────────────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');

async function handleLogout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login.html';
}

logoutBtn.addEventListener('click', handleLogout);

// ─── Queue rendering ────────────────────────────────────────────────────────
const queueEl = document.getElementById('queue');
const emptyState = document.getElementById('emptyState');
const pendingCountEl = document.getElementById('pendingCount');

function showEmptyState() {
    queueEl.innerHTML = '';
    queueEl.appendChild(emptyState);
}

function hideEmptyState() {
    if (emptyState.parentNode === queueEl) {
        queueEl.removeChild(emptyState);
    }
}

function updatePendingCount(count) {
    pendingCountEl.textContent = String(count);
    pendingCountEl.dataset.empty = count === 0 ? 'true' : 'false';
}

function formatCorrectionBody(content) {
    const withLabels = content
        .replace(/##\s*Problem/i, '<strong>Problem</strong>')
        .replace(/##\s*Solution/i, '<strong>Solution</strong>');
    return withLabels;
}

function buildCorrectionCard(correction) {
    const card = document.createElement('div');
    card.className = 'correction-card';
    card.dataset.messageId = correction.message_id;

    const body = document.createElement('div');
    body.className = 'correction-card-body';
    body.innerHTML = formatCorrectionBody(escapeHtml(correction.content));

    const actions = document.createElement('div');
    actions.className = 'correction-card-actions';
    actions.innerHTML = `
        <button class="correction-action-btn correction-action-btn--reject">Reject</button>
        <button class="correction-action-btn correction-action-btn--approve">Approve</button>
    `;

    card.appendChild(body);
    card.appendChild(actions);
    return card;
}

function renderQueue(corrections) {
    queueEl.innerHTML = '';
    updatePendingCount(corrections.length);

    if (corrections.length === 0) {
        showEmptyState();
        return;
    }

    for (const correction of corrections) {
        queueEl.appendChild(buildCorrectionCard(correction));
    }
}

// Escape user/model-generated text before inserting as HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Fetching ────────────────────────────────────────────────────────────────
async function fetchPendingCorrections() {
    const response = await fetch('/admin/pending-corrections');
    if (!response.ok) {
        showLoadError();
        return;
    }
    const corrections = await response.json();
    renderQueue(corrections);
}

function showLoadError() {
    queueEl.innerHTML = '';
    const errorState = document.createElement('div');
    errorState.className = 'admin-empty-state';
    errorState.innerHTML = `
        <p>Couldn't load pending corrections.</p>
        <p class="admin-empty-hint">Try refreshing.</p>
    `;
    queueEl.appendChild(errorState);
}

// ─── Approve / reject ───────────────────────────────────────────────────────
function setCardBusy(card, busy) {
    const buttons = card.querySelectorAll('.correction-action-btn');
    buttons.forEach(function (button) {
        button.disabled = busy;
    });
}

function removeCard(card) {
    card.classList.add('leaving');
    card.addEventListener('animationend', function () {
        card.remove();
        const remaining = queueEl.querySelectorAll('.correction-card').length;
        updatePendingCount(remaining);
        if (remaining === 0) {
            showEmptyState();
        }
    });
}

async function handleQueueClick(event) {
    const approveBtn = event.target.closest('.correction-action-btn--approve');
    const rejectBtn = event.target.closest('.correction-action-btn--reject');
    if (approveBtn === null && rejectBtn === null) return;

    const card = event.target.closest('.correction-card');
    const messageId = card.dataset.messageId;
    const action = approveBtn !== null ? 'approve' : 'reject';

    setCardBusy(card, true);

    const response = await fetch(`/admin/pending-corrections/${messageId}/${action}`, {
        method: 'POST',
    });

    if (response.ok) {
        removeCard(card);
    } else {
        setCardBusy(card, false);
    }
}

queueEl.addEventListener('click', handleQueueClick);

// ─── Startup ────────────────────────────────────────────────────────────────
fetchPendingCorrections();

// ─── Refresh button ─────────────────────────────────────────────────────────
const refreshBtn = document.getElementById('refreshBtn');

function handleRefreshClick() {
    refreshBtn.classList.add('spinning');
    fetchPendingCorrections().finally(function () {
        setTimeout(function () {
            refreshBtn.classList.remove('spinning');
        }, 300);
    });
}

refreshBtn.addEventListener('click', handleRefreshClick);