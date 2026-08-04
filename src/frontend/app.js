// ─── Data model ───────────────────────────────────────────────────────────────
const conversations = new Map();
let currentConversationId = null;

function createConversation() {
    const now = Date.now();
    return {
        id: crypto.randomUUID(),
        title: null,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
}

function createMessage(role, content, error = false) {
    return {
        id: crypto.randomUUID(),
        role,
        rating: null,
        content,
        createdAt: Date.now(),
        error,
    };
}

function getCurrentConversation() {
    if (currentConversationId === null) return null;
    return conversations.get(currentConversationId) ?? null;
}

function appendMessageToCurrent(message) {
    const conversation = getCurrentConversation();
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
}



// ─── Persistence ──────────────────────────────────────────────────────────────
const CONVERSATIONS_KEY = 'tla_conversations';
const CURRENT_ID_KEY = 'tla_current_conversation_id';

function saveState() {
    try {
        const payload = {
            conversations: [...conversations],
            currentConversationId,
        };
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(payload));
    } catch (err) {
        console.warn('Failed to save state to localStorage:', err);
    }
}

function loadState() {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (raw === null) return;

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return;
    }

    if (!isValidPayload(parsed)) return;

    conversations.clear();
    for (const [id, conversation] of parsed.conversations) {
        conversations.set(id, conversation);
    }
    currentConversationId = parsed.currentConversationId;
}

function isValidPayload(payload) {
    if (payload === null || typeof payload !== 'object') return false;
    if (!Array.isArray(payload.conversations)) return false;
    for (const entry of payload.conversations) {
        if (!Array.isArray(entry) || entry.length !== 2) return false;
        const [id, conversation] = entry;
        if (typeof id !== 'string') return false;
        if (!isValidConversation(conversation)) return false;
    }
    const currentId = payload.currentConversationId;
    if (currentId !== null && typeof currentId !== 'string') return false;
    return true;
}

function isValidConversation(conversation) {
    if (conversation === null || typeof conversation !== 'object') return false;
    if (typeof conversation.id !== 'string') return false;
    if (conversation.title !== null && typeof conversation.title !== 'string') return false;
    if (!Array.isArray(conversation.messages)) return false;
    if (typeof conversation.createdAt !== 'number') return false;
    if (typeof conversation.updatedAt !== 'number') return false;
    return true;
}




// ─── Rendering ────────────────────────────────────────────────────────────────
const messagesEl = document.getElementById('messages');
const emptyState = document.getElementById('emptyState');

function renderChatArea() {
    clearChatArea();
    const conversation = getCurrentConversation();
    if (conversation === null || conversation.messages.length === 0) {
        showEmptyState();
        return;
    }
    for (const message of conversation.messages) {
        appendMessageBubble(message);
    }
    scrollToBottom();
}

function clearChatArea() {
    messagesEl.innerHTML = '';
}

function showEmptyState() {
    messagesEl.appendChild(emptyState);
    emptyState.style.display = '';
}

function hideEmptyState() {
    if (emptyState.parentNode === messagesEl) {
        messagesEl.removeChild(emptyState);
    }
}

function appendMessageBubble(message) {
    if (message.role === 'user') {
        appendUserBubble(message);
    } else {
        appendAssistantBubble(message);
    }
}

function appendUserBubble(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message message--user';
    wrapper.dataset.messageId = message.id;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = message.content;

    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
}

function appendAssistantBubble(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message message--assistant';
    wrapper.dataset.messageId = message.id;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = message.content;

    const feedback = buildFeedbackControls(message);

    wrapper.appendChild(bubble);
    wrapper.appendChild(feedback);
    messagesEl.appendChild(wrapper);
    
}

function getSelectedFeedbackClass(rating, buttonType) {
    if (rating === 'positive' && buttonType === 'up') return true;
    if (rating === 'negative' && buttonType === 'down') return true;
    return false;
}

function applyFeedbackSelection(feedbackEl, rating) {
    const upBtn = feedbackEl.querySelector('.feedback-btn--up');
    const downBtn = feedbackEl.querySelector('.feedback-btn--down');
    upBtn.classList.toggle('feedback-btn--selected', getSelectedFeedbackClass(rating, 'up'));
    downBtn.classList.toggle('feedback-btn--selected', getSelectedFeedbackClass(rating, 'down'));
}

function buildFeedbackControls(message) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.dataset.messageId = message.id;
    feedback.innerHTML = `
        <button class="feedback-btn feedback-btn--up" aria-label="Helpful">👍</button>
        <button class="feedback-btn feedback-btn--down" aria-label="Not helpful">👎</button>
    `;
    applyFeedbackSelection(feedback, message.rating);
    return feedback;
}


function getMessageById(messageId) {
    for (const conversation of conversations.values()) {
        const found = conversation.messages.find(function (message) {
            return message.id === messageId;
        });
        if (found !== undefined) return found;
    }
    return null;
}

function toggleMessageRating(message, clickedRating) {
    message.rating = message.rating === clickedRating ? null : clickedRating;
}

function handleFeedbackClick(event) {
    const button = event.target.closest('.feedback-btn');
    if (button === null) return;

    const feedbackEl = button.closest('.feedback');
    const messageId = feedbackEl.dataset.messageId;
    const message = getMessageById(messageId);
    if (message === null) return;

    const clickedRating = button.classList.contains('feedback-btn--up') ? 'positive' : 'negative';
    toggleMessageRating(message, clickedRating);
    applyFeedbackSelection(feedbackEl, message.rating);
    saveState();
}

messagesEl.addEventListener('click', handleFeedbackClick);

function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

let activeFeedbackMessageId = null;
function sendRatingFeedback(message, conversationId, query) {
    fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message_id: message.id,
            conversation_id: conversationId,
            query,
            answer: message.content,
            rating: message.rating,
        }),
    }).catch(function (err) {
        console.warn('Failed to send rating feedback:', err);
    });
}

function handleFeedbackClick(event) {
    const button = event.target.closest('.feedback-btn');
    if (button === null) return;

    const feedbackEl = button.closest('.feedback');
    const messageId = feedbackEl.dataset.messageId;
    const message = getMessageById(messageId);
    if (message === null) return;

    const clickedRating = button.classList.contains('feedback-btn--up') ? 'positive' : 'negative';
    toggleMessageRating(message, clickedRating);
    applyFeedbackSelection(feedbackEl, message.rating);
    saveState();

    const conversation = findConversationByMessageId(messageId);
    const query = getQueryForMessage(conversation, messageId);
    sendRatingFeedback(message, conversation.id, query);

    if (message.rating === 'negative') {
        activeFeedbackMessageId = messageId;
        openSheet();
    }
}

function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetOverlay.classList.remove('active');
    document.getElementById('sheetInput').value = '';
    activeFeedbackMessageId = null;
}



function findConversationByMessageId(messageId) {
    for (const conversation of conversations.values()) {
        const hasMessage = conversation.messages.some(function (message) {
            return message.id === messageId;
        });
        if (hasMessage) return conversation;
    }
    return null;
}

function getQueryForMessage(conversation, messageId) {
    const index = conversation.messages.findIndex(function (message) {
        return message.id === messageId;
    });
    if (index <= 0) return null;
    return conversation.messages[index - 1].content;
}

// -------Sidebar Toggle -----------

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


// ─── Sidebar history ──────────────────────────────────────────────────────────
const historyList = document.querySelector('.history-list');

function refreshSidebar() {
    historyList.innerHTML = '';
    const entries = getSortedConversations();
    for (const conversation of entries) {
        if (conversation.title === null) continue;
        historyList.appendChild(buildSidebarEntry(conversation));
    }
}

function getSortedConversations() {
    return [...conversations.values()].sort(function (a, b) {
        return b.updatedAt - a.updatedAt;
    });
}

function buildSidebarEntry(conversation) {
    const li = document.createElement('li');
    li.dataset.conversationId = conversation.id;
    li.textContent = conversation.title;
    if (conversation.id === currentConversationId) {
        li.classList.add('history-entry--active');
    }
    return li;
}

function handleSidebarClick(event) {
    console.log('sidebar click fired', event.target);
    const entry = event.target.closest('[data-conversation-id]');
    if (entry === null) return;
    const conversationId = entry.dataset.conversationId;
    if (conversationId === currentConversationId) {
        closeSidebar();
        return;
    }
    currentConversationId = conversationId;
    renderChatArea();
    closeSidebar();
    refreshSidebar();
    saveState();
}

historyList.addEventListener('click', handleSidebarClick);


// ─── Bottom sheet ───

const bottomSheet = document.getElementById('bottomSheet');
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetClose = document.getElementById('sheetClose');
const sheetInput = document.getElementById('sheetInput');
const sheetSubmit = document.getElementById('sheetSubmit');

function updateSubmitButtonState() {
    const hasText = sheetInput.value.trim() !== '';
    sheetSubmit.disabled = !hasText;
}

sheetInput.addEventListener('input', updateSubmitButtonState);

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



// ─── Send query ───────────────────────────────────────────────────────────────
const sendBtn = document.querySelector('.send-btn');
const messageInput = document.querySelector('.message-input');

const TITLE_MAX_LENGTH = 40;
let isRequestInFlight = false;

async function sendQuery() {
    if (isRequestInFlight) return;
    const userText = messageInput.value.trim();
    if (userText === '') return;

    isRequestInFlight = true;
    sendBtn.classList.add('sending');
    messageInput.value = '';

    ensureCurrentConversation();
    const userMessage = createMessage('user', userText);
    appendMessageToCurrent(userMessage);
    setTitleIfMissing(userText);
    refreshSidebar();
    hideEmptyState();
    appendMessageBubble(userMessage);
    scrollToBottom();

    const assistantMessage = createMessage('assistant', '');
    appendMessageToCurrent(assistantMessage);
    appendMessageBubble(assistantMessage);
    const assistantBubble = getBubbleElement(assistantMessage.id);
    scrollToBottom();

    try {
        const responseText = await streamAssistantResponse(userText, assistantBubble);
        assistantMessage.content = responseText;
    } catch (err) {
        assistantMessage.content = `Error: ${err.message}`;
        assistantMessage.error = true;
        assistantBubble.textContent = assistantMessage.content;
    } finally {
        isRequestInFlight = false;
        sendBtn.classList.remove('sending');
        saveState();
        refreshSidebar();
    }
}

function ensureCurrentConversation() {
    if (currentConversationId !== null && conversations.has(currentConversationId)) return;
    const conversation = createConversation();
    conversations.set(conversation.id, conversation);
    currentConversationId = conversation.id;
}

function setTitleIfMissing(firstUserText) {
    const conversation = getCurrentConversation();
    if (conversation.title !== null) return;
    conversation.title = truncateTitle(firstUserText);
}

function truncateTitle(text) {
    if (text.length <= TITLE_MAX_LENGTH) return text;
    return text.slice(0, TITLE_MAX_LENGTH) + '…';
}

function getBubbleElement(messageId) {
    const wrapper = messagesEl.querySelector(`[data-message-id="${messageId}"]`);
    return wrapper.querySelector('.bubble');
}

function buildHistoryPayload() {
    const conversation = getCurrentConversation();
    return conversation.messages
        .filter(function (message) { return message.error === false; })
        .slice(0, -1)
        .slice(-6)
        .map(function (message) {
            return { role: message.role, content: message.content };
        });
}

async function streamAssistantResponse(query, bubble) {
    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history: buildHistoryPayload() }),
    });

    if (!response.ok) {
        throw new Error('could not reach the advisor service');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
        bubble.textContent = fullText;
        scrollToBottom();
    }

    return fullText;
}

// send button event listeners
sendBtn.addEventListener('click', sendQuery);
messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendQuery();
    }
});


// ─── Dark mode ─── 
const themeToggle = document.getElementById('darkModeToggle');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.checked = true;
}

themeToggle.addEventListener('change', function () {
    document.body.classList.toggle('dark', themeToggle.checked);
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
});


// ─── New chat ─────────────────────────────────────────────────────────────────
const newChatBtn = document.getElementById('newChatBtn');

function handleNewChat() {
    currentConversationId = null;
    renderChatArea();
    refreshSidebar();
    closeSidebar();
    saveState();
}

newChatBtn.addEventListener('click', handleNewChat);


// ─── Startup ──────────────────────────────────────────────────────────────────
function restoreFromStorage() {
    loadState();
    if (currentConversationId !== null && !conversations.has(currentConversationId)) {
        currentConversationId = null;
    }
    refreshSidebar();
    renderChatArea();
}

restoreFromStorage();


const THANKS_DISPLAY_DURATION_MS = 1500;

function sendCorrectionFeedback(messageId, conversationId, correctSolution,query, answer) {
    fetch('/feedback/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message_id: messageId,
            conversation_id: conversationId,
            correct_solution: correctSolution,
            query,
            answer,
        }),
    }).catch(function (err) {
        console.warn('Failed to send correction feedback:', err);
    });
}

function showThanksView() {
    sheetInputView.classList.add('hidden');
    sheetThanksView.classList.add('visible');
}

function handleSheetSubmit() {
    const correctSolution = sheetInput.value.trim();
    if (correctSolution === '') return;

    const conversation = findConversationByMessageId(activeFeedbackMessageId);
    if (conversation === null) return;

    const message = getMessageById(activeFeedbackMessageId);
    const query = getQueryForMessage(conversation, activeFeedbackMessageId);

    sendCorrectionFeedback(activeFeedbackMessageId, conversation.id, correctSolution, query, message.content);
    showThanksView();
    setTimeout(closeSheet, THANKS_DISPLAY_DURATION_MS);
}

sheetSubmit.addEventListener('click', handleSheetSubmit);


function resetSheetToInputView() {
    sheetInputView.classList.remove('hidden');
    sheetThanksView.classList.remove('visible');
}

function openSheet() {
    resetSheetToInputView();
    bottomSheet.classList.add('open');
    sheetOverlay.classList.add('active');
    sheetInput.value = '';
    updateSubmitButtonState();
    document.getElementById('sheetInput').focus();
}