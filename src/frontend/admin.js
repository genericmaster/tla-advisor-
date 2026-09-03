// ─── Sidebar toggle ──────────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); }

menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ─── Logout ──────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login.html';
});

// ─── Nav switching ───────────────────────────────────────────────────────────
const navCorrections = document.getElementById('navCorrections');
const navDocuments = document.getElementById('navDocuments');
const queueSection = document.getElementById('queueSection');
const documentsSection = document.getElementById('documentsSection');
const adminTitle = document.getElementById('adminTitle');

function showCorrections() {
    queueSection.classList.remove('hidden');
    documentsSection.classList.add('hidden');
    navCorrections.classList.add('admin-nav-item--active');
    navDocuments.classList.remove('admin-nav-item--active');
    adminTitle.textContent = 'Pending Corrections';
    fetchPendingCorrections();
    closeSidebar();
}

function showDocuments() {
    documentsSection.classList.remove('hidden');
    queueSection.classList.add('hidden');
    navDocuments.classList.add('admin-nav-item--active');
    navCorrections.classList.remove('admin-nav-item--active');
    adminTitle.textContent = 'Documents';
    fetchDocuments();
    closeSidebar();
}

navCorrections.addEventListener('click', showCorrections);
navDocuments.addEventListener('click', showDocuments);

// ─── Refresh button ──────────────────────────────────────────────────────────
const refreshBtn = document.getElementById('refreshBtn');
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    const isCorrections = !queueSection.classList.contains('hidden');
    const task = isCorrections ? fetchPendingCorrections() : fetchDocuments();
    task.finally(() => setTimeout(() => refreshBtn.classList.remove('spinning'), 300));
});

// ─── Corrections ─────────────────────────────────────────────────────────────
const queueEl = document.getElementById('queueSection');
const emptyState = document.getElementById('emptyState');
const pendingCountEl = document.getElementById('pendingCount');

function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatCorrectionBody(content) {
    return content.replace(/##\s*Problem/i,'<strong>Problem</strong>').replace(/##\s*Solution/i,'<strong>Solution</strong>');
}

function updatePendingCount(count) {
    pendingCountEl.textContent = String(count);
    pendingCountEl.dataset.empty = count === 0 ? 'true' : 'false';
}

function buildCorrectionCard(correction) {
    const card = document.createElement('div');
    card.className = 'correction-card';
    card.dataset.messageId = correction.message_id;
    card.innerHTML = `
        <div class="correction-card-body">${formatCorrectionBody(escapeHtml(correction.content))}</div>
        <div class="correction-card-actions">
            <button class="correction-action-btn correction-action-btn--reject">Reject</button>
            <button class="correction-action-btn correction-action-btn--approve">Approve</button>
        </div>`;
    return card;
}

function renderQueue(corrections) {
    queueEl.innerHTML = '';
    updatePendingCount(corrections.length);
    if (corrections.length === 0) {
        queueEl.appendChild(emptyState);
        return;
    }
    for (const c of corrections) queueEl.appendChild(buildCorrectionCard(c));
}

async function fetchPendingCorrections() {
    const res = await fetch('/admin/pending-corrections');
    if (!res.ok) { queueEl.innerHTML = '<div class="admin-empty-state"><p>Could not load corrections.</p></div>'; return; }
    renderQueue(await res.json());
}

function removeCard(card) {
    card.classList.add('leaving');
    card.addEventListener('animationend', () => {
        card.remove();
        const remaining = queueEl.querySelectorAll('.correction-card').length;
        updatePendingCount(remaining);
        if (remaining === 0) queueEl.appendChild(emptyState);
    });
}

queueEl.addEventListener('click', async (e) => {
    const approve = e.target.closest('.correction-action-btn--approve');
    const reject = e.target.closest('.correction-action-btn--reject');
    if (!approve && !reject) return;
    const card = e.target.closest('.correction-card');
    const messageId = card.dataset.messageId;
    const action = approve ? 'approve' : 'reject';
    card.querySelectorAll('button').forEach(b => b.disabled = true);
    const res = await fetch(`/admin/pending-corrections/${messageId}/${action}`, { method: 'POST' });
    if (res.ok) removeCard(card);
    else card.querySelectorAll('button').forEach(b => b.disabled = false);
});

// ─── Documents ───────────────────────────────────────────────────────────────
const docList = document.getElementById('docList');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

async function fetchDocuments() {
    docList.innerHTML = '<li class="admin-empty-state" style="margin-top:0">Loading...</li>';
    const res = await fetch('/admin/documents');
    if (!res.ok) { docList.innerHTML = '<li class="admin-empty-state" style="margin-top:0">Could not load documents.</li>'; return; }
    const data = await res.json();
    renderDocuments(data.documents);
}

function renderDocuments(docs) {
    docList.innerHTML = '';
    if (docs.length === 0) {
        docList.innerHTML = '<li class="admin-empty-state" style="margin-top:0">No documents ingested yet.</li>';
        return;
    }
    for (const name of docs) {
        const li = document.createElement('li');
        li.className = 'doc-list-item';
        li.innerHTML = `<span>${escapeHtml(name)}</span><button class="doc-delete-btn" data-name="${escapeHtml(name)}">✕</button>`;
        docList.appendChild(li);
    }
}

docList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.doc-delete-btn');
    if (!btn) return;
    const name = btn.dataset.name;
    if (!confirm(`Delete "${name}" from the knowledge base?`)) return;
    btn.disabled = true;
    const res = await fetch(`/admin/documents/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) fetchDocuments();
    else { btn.disabled = false; alert('Could not delete document.'); }
});

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    uploadStatus.textContent = 'Uploading...';
    uploadStatus.className = 'doc-upload-status';
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/upload-file', { method: 'POST', body: form });
    if (res.ok) {
        uploadStatus.textContent = `"${file.name}" ingested successfully.`;
        uploadStatus.className = 'doc-upload-status success';
        fileInput.value = '';
        fetchDocuments();
    } else {
        uploadStatus.textContent = 'Upload failed. Check the file type and try again.';
        uploadStatus.className = 'doc-upload-status error';
    }
});

// ─── Init ────────────────────────────────────────────────────────────────────
fetchPendingCorrections();