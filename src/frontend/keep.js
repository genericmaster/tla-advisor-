
// ─── Sidebar toggle ───────────────────────────────────────────────────────────
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

// ─── Bottom sheet toggle ──────────────────────────────────────────────────────
const bottomSheet = document.getElementById('bottomSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetClose = document.getElementById('sheetClose');


function openSheet() {
    bottomSheet.classList.add('open');
    sheetOverlay.classList.add('active');
    document.getElementById('sheetInput').focus();
}

function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetOverlay.classList.remove('active');
    document.getElementById('sheetInput').value = '';
}

sheetClose.addEventListener('click', closeSheet);
sheetOverlay.addEventListener('click', closeSheet);

// ─── Chat state ───────────────────────────────────────────────────────────────
let history = [];
let isFirstMessage = true; // track if this is the start of a new conversation
let isRequestInFlight = false;  //track if chat is already streaming

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const messagesEl = document.getElementById('messages');
const emptyState = document.getElementById('emptyState');
const sendBtn = document.querySelector('.send-btn');
const checkbox = document.getElementById('darkModeToggle')


//dark mode persistance
const theme=localStorage.getItem('theme')
if (theme==='dark'){
     document.body.classList.add('dark');
     checkbox.checked = true
}

function hideEmptyState() {
    if (emptyState) emptyState.style.display = 'none';
}

// Create and append a user message bubble
function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message message--user';
    div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
}

// Create an assistant message bubble and return the bubble element
// so we can stream tokens into it
function createAssistantMessage() {
    const div = document.createElement('div');
    div.className = 'message message--assistant';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = '';

    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.innerHTML = `
        <button class="feedback-btn feedback-btn--up" aria-label="Helpful">👍</button>
        <button class="feedback-btn feedback-btn--down" aria-label="Not helpful">👎</button>
    `;

    div.appendChild(bubble);
    div.appendChild(feedback);
    messagesEl.appendChild(div);

    // Wire thumbs down on this new message to open the sheet
    feedback.querySelector('.feedback-btn--down').addEventListener('click', openSheet);

    scrollToBottom();
    return bubble;
}

function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Prevent XSS — escape user-typed text before inserting into HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Sidebar history ──────────────────────────────────────────────────────────
const historyList = document.querySelector('.history-list');

function addToSidebarHistory(title) {
    // Truncate long titles
    const label = title.length > 40 ? title.slice(0, 40) + '…' : title;
    const li = document.createElement('li');
    li.textContent = label;
    // Prepend so newest appears at top
    historyList.prepend(li);
}

// ─── Clear chat ───────────────────────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', function () {
    history = [];
    isFirstMessage = true;
    messagesEl.innerHTML = '';
    if (emptyState) {
        const fresh = emptyState.cloneNode(true);
        fresh.style.display = '';
        messagesEl.appendChild(fresh);
    }
});

// ─── Send query ───────────────────────────────────────────────────────────────
async function sendQuery() {
    console.log('sendQuery called, isRequestInFlight =', isRequestInFlight);
    if (isRequestInFlight) return;
    const input = document.querySelector('.message-input');
    const userMessage = input.value.trim();
    if (!userMessage) return;
    isRequestInFlight =true;
    sendBtn.classList.add('sending');
    

    // Clear input immediately
    input.value = '';

    // Hide empty state, show user message
    hideEmptyState();
    appendUserMessage(userMessage);

    // Add to sidebar history on first message of a conversation
    if (isFirstMessage) {
        addToSidebarHistory(userMessage);
        isFirstMessage = false;
    }

    // Create assistant bubble to stream into
    const bubble = createAssistantMessage();

    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userMessage, history: history.slice(-6) })
        });

        if (!response.ok) {
            bubble.textContent = 'Error: could not reach the advisor service.';
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            fullResponse += chunk;
            bubble.textContent = fullResponse; // update bubble live as tokens arrive
            scrollToBottom();
        }

        // Update history after full response collected
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: fullResponse });
        history = history.slice(-6);

    } catch (err) {
        bubble.textContent = 'Error: ' + err.message;
    }
    finally{
        isRequestInFlight = false;
        sendBtn.classList.remove('sending');
    }
}
sendBtn.addEventListener('click', sendQuery);
document.querySelector('.message-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendQuery();
    }
});

document.getElementById('newChatBtn').addEventListener('click', function() {
    history = [];
    isFirstMessage = true;
    messagesEl.innerHTML = '';
    if (emptyState) {
        const fresh = emptyState.cloneNode(true);
        fresh.style.display = '';
        messagesEl.appendChild(fresh);
    }
    closeSidebar();
});

document.getElementById('darkModeToggle').addEventListener('change', function() {
    document.body.classList.toggle('dark', this.checked);
    localStorage.setItem('theme', this.checked ? 'dark' : 'light');
});