// ─── Data model ───────────────────────────────────────────────────────────────
const conversations = new Map();
let currentConversationId = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createConversation() {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        title: null,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
}

function createMessage(role, content, error = false) {
    return {
        id: generateId(),
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
    conversation.updatedAt = new Date().toISOString();
}

function deleteConversation(conversationId) {
    conversations.delete(conversationId);
    if (currentConversationId === conversationId) {
        currentConversationId = null;
    }
}

function renameConversation(conversationId, newTitle) {
    const conversation = conversations.get(conversationId);
    if (conversation === undefined) return;
    conversation.title = newTitle;
}


// ─── Persistence (backend API) ────────────────────────────────────────────────

function toApiPayload(conversation) {
    // converts camelCase local model to snake_case for backend
    return {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
    };
}

function fromApiPayload(data) {
    // converts snake_case from backend to camelCase local model
    return {
        id: data.id,
        title: data.title,
        messages: data.messages,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

function saveState() {
    const conversation = getCurrentConversation();
    if (conversation === null) return;
    localStorage.setItem('tla_current_id', conversation.id);
    syncConversation(conversation);
}

function syncConversation(conversation) {
    // fire-and-forget POST to backend — same pattern as sendRatingFeedback
    fetch('/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiPayload(conversation)),
    }).catch(function (err) {
        console.warn('Failed to sync conversation:', err);
    });
}

function removeConversationFromBackend(conversationId) {
    fetch(`/conversations/${conversationId}`, {
        method: 'DELETE',
    }).catch(function (err) {
        console.warn('Failed to delete conversation from backend:', err);
    });
}

async function fetchConversations() {
    try {
        const response = await fetch('/conversations');
        if (!response.ok) return;
        const data = await response.json();
        conversations.clear();
        for (const item of data) {
            const conversation = fromApiPayload(item);
            conversations.set(conversation.id, conversation);
        }
    } catch (err) {
        console.warn('Failed to fetch conversations:', err);
    }
}


// ─── Typing indicator ─────────────────────────────────────────────────────────

function showTypingIndicator(bubble) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    const dot1 = document.createElement('span');
    const dot2 = document.createElement('span');
    const dot3 = document.createElement('span');
    indicator.appendChild(dot1);
    indicator.appendChild(dot2);
    indicator.appendChild(dot3);
    bubble.appendChild(indicator);
}

function hideTypingIndicator(bubble) {
    const indicator = bubble.querySelector('.typing-indicator');
    if (indicator !== null) {
        indicator.remove();
    }
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

    wrapper.appendChild(bubble);

    if (message.content !== '') {
        wrapper.appendChild(buildFeedbackControls(message));
    }

    messagesEl.appendChild(wrapper);
}

function appendFeedbackToMessage(messageId) {
    const wrapper = messagesEl.querySelector(`[data-message-id="${messageId}"]`);
    if (wrapper === null) return;
    const message = getMessageById(messageId);
    if (message === null) return;
    const feedback = buildFeedbackControls(message);
    wrapper.appendChild(feedback);
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

    const conversation = findConversationByMessageId(messageId);
    const query = getQueryForMessage(conversation, messageId);
    sendRatingFeedback(message, conversation.id, query);

    if (message.rating === 'negative') {
        activeFeedbackMessageId = messageId;
        openSheet();
    }
}

messagesEl.addEventListener('click', handleFeedbackClick);

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


// ─── Sidebar history ──────────────────────────────────────────────────────────
const historyList = document.querySelector('.history-list');
let openEntryMenuId = null;

function refreshSidebar() {
    historyList.innerHTML = '';
    openEntryMenuId = null;
    const entries = getSortedConversations();
    for (const conversation of entries) {
        if (conversation.title === null) continue;
        historyList.appendChild(buildSidebarEntry(conversation));
    }
}

const chatTitleEl = document.querySelector('.chat-title');

function updateHeaderTitle() {
    const conversation = getCurrentConversation();
    chatTitleEl.textContent = (conversation !== null && conversation.title !== null)
        ? conversation.title
        : 'New Chat';
}

function getSortedConversations() {
    return [...conversations.values()].sort(function (a, b) {
        return b.updatedAt > a.updatedAt ? 1 : -1;
    });
}

function buildSidebarEntry(conversation) {
    const li = document.createElement('li');
    li.className = 'history-entry';
    li.dataset.conversationId = conversation.id;
    if (conversation.id === currentConversationId) {
        li.classList.add('history-entry--active');
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'history-entry-title';
    titleEl.textContent = conversation.title;

    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'history-entry-options';
    optionsBtn.setAttribute('aria-label', 'Conversation options');
    optionsBtn.textContent = '⋮';

    const menu = document.createElement('div');
    menu.className = 'history-entry-menu';
    menu.innerHTML = `
        <button class="history-entry-menu-item history-entry-menu-item--rename">Rename</button>
        <button class="history-entry-menu-item history-entry-menu-item--delete">Delete</button>
    `;

    li.appendChild(titleEl);
    li.appendChild(optionsBtn);
    li.appendChild(menu);
    return li;
}

function closeEntryMenu() {
    const openMenu = historyList.querySelector('.history-entry-menu.open');
    if (openMenu !== null) {
        openMenu.classList.remove('open');
    }
    openEntryMenuId = null;
}

function toggleEntryMenu(entry) {
    const conversationId = entry.dataset.conversationId;
    if (openEntryMenuId === conversationId) {
        closeEntryMenu();
        return;
    }
    closeEntryMenu();
    entry.querySelector('.history-entry-menu').classList.add('open');
    openEntryMenuId = conversationId;
}

function handleDeleteClick(entry) {
    const conversationId = entry.dataset.conversationId;
    const confirmed = confirm('Delete this conversation? This cannot be undone.');
    if (!confirmed) return;
    removeConversationFromBackend(conversationId);
    deleteConversation(conversationId);
    closeEntryMenu();
    renderChatArea();
    updateHeaderTitle();
    refreshSidebar();
}

function startEntryRename(entry) {
    closeEntryMenu();
    const conversationId = entry.dataset.conversationId;
    const titleEl = entry.querySelector('.history-entry-title');
    const currentTitle = titleEl.textContent;

    const input = document.createElement('input');
    input.className = 'history-entry-rename-input';
    input.type = 'text';
    input.value = currentTitle;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    function commitRename() {
        const newTitle = input.value.trim();
        if (newTitle !== '') {
            renameConversation(conversationId, newTitle);
            const conversation = conversations.get(conversationId);
            if (conversation !== undefined) {
                syncConversation(conversation);
            }
            if (conversationId === currentConversationId) {
                updateHeaderTitle();
            }
        }
        refreshSidebar();
    }

    input.addEventListener('blur', commitRename);
    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            input.blur();
        } else if (event.key === 'Escape') {
            input.removeEventListener('blur', commitRename);
            refreshSidebar();
        }
    });
}

function handleSidebarClick(event) {
    const deleteBtn = event.target.closest('.history-entry-menu-item--delete');
    if (deleteBtn !== null) {
        handleDeleteClick(deleteBtn.closest('[data-conversation-id]'));
        return;
    }

    const renameBtn = event.target.closest('.history-entry-menu-item--rename');
    if (renameBtn !== null) {
        startEntryRename(renameBtn.closest('[data-conversation-id]'));
        return;
    }

    const optionsBtn = event.target.closest('.history-entry-options');
    if (optionsBtn !== null) {
        toggleEntryMenu(optionsBtn.closest('[data-conversation-id]'));
        return;
    }

    const entry = event.target.closest('[data-conversation-id]');
    if (entry === null) return;
    const conversationId = entry.dataset.conversationId;
    if (conversationId === currentConversationId) {
        closeSidebar();
        return;
    }
    currentConversationId = conversationId;
    localStorage.setItem('tla_current_id', conversationId);
    renderChatArea();
    updateHeaderTitle();
    closeSidebar();
    refreshSidebar();
}

historyList.addEventListener('click', handleSidebarClick);

// ─── Logout ───────────────────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');

async function handleLogout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login.html';
}

logoutBtn.addEventListener('click', handleLogout);

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
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
    resetSheetToInputView();
    bottomSheet.classList.add('open');
    sheetOverlay.classList.add('active');
    sheetInput.value = '';
    updateSubmitButtonState();
    document.getElementById('sheetInput').focus();
}

function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetOverlay.classList.remove('active');
    document.getElementById('sheetInput').value = '';
    activeFeedbackMessageId = null;
}

sheetClose.addEventListener('click', closeSheet);
sheetOverlay.addEventListener('click', closeSheet);


// ─── Send query ───────────────────────────────────────────────────────────────
const sendBtn = document.querySelector('.send-btn');
const messageInput = document.querySelector('.message-input');

let isRequestInFlight = false;

async function sendQuery() {
    let assistantMessage = null;
    let assistantBubble = null;

    try {
        if (isRequestInFlight) return;
        const userText = messageInput.value.trim();
        if (userText === '') return;

        isRequestInFlight = true;
        sendBtn.classList.add('sending');
        messageInput.value = '';

        ensureCurrentConversation();
        const userMessage = createMessage('user', userText);
        appendMessageToCurrent(userMessage);
        hideEmptyState();
        appendMessageBubble(userMessage);
        scrollToBottom();

        assistantMessage = createMessage('assistant', '');
        appendMessageToCurrent(assistantMessage);
        appendMessageBubble(assistantMessage);
        assistantBubble = getBubbleElement(assistantMessage.id);
        scrollToBottom();

        const responseText = await streamAssistantResponse(userText, assistantBubble);
        assistantMessage.content = responseText;
        appendFeedbackToMessage(assistantMessage.id);
        if (shouldSetTitleNow()) {
            setTitleIfMissing(responseText);
        }
        updateHeaderTitle();
    } catch (error) {
        if (assistantMessage !== null) {
            assistantMessage.content = `Error: ${error.message}`;
            assistantMessage.error = true;
            assistantBubble.textContent = assistantMessage.content;
        }
    } finally {
        isRequestInFlight = false;
        sendBtn.classList.remove('sending');
        saveState();
        refreshSidebar();
        updateHeaderTitle();
    }
}

function ensureCurrentConversation() {
    if (currentConversationId !== null && conversations.has(currentConversationId)) return;
    const conversation = createConversation();
    conversations.set(conversation.id, conversation);
    currentConversationId = conversation.id;
}

function shouldSetTitleNow() {
    const conversation = getCurrentConversation();
    const userMessageCount = conversation.messages.filter(function (message) {
        return message.role === 'user';
    }).length;
    return userMessageCount >= 2;
}

function setTitleIfMissing(text) {
    const conversation = getCurrentConversation();
    if (conversation.title !== null) return;
    conversation.title = truncateTitle(text);
}

function truncateTitle(text) {
    const words = text.trim().split(/\s+/);
    if (words.length <= 5) return text.trim();
    return words.slice(0, 5).join(' ') + '…';
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

    showTypingIndicator(bubble);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let firstChunk = true;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunk) {
            hideTypingIndicator(bubble);
            firstChunk = false;
        }
        fullText += decoder.decode(value);
        bubble.textContent = fullText;
        scrollToBottom();
    }

    return fullText;
}

sendBtn.addEventListener('click', sendQuery);
messageInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendQuery();
    }
});


// ─── Dark mode ────────────────────────────────────────────────────────────────
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
    localStorage.removeItem('tla_current_id');
    renderChatArea();
    updateHeaderTitle();
    refreshSidebar();
    closeSidebar();
}
newChatBtn.addEventListener('click', handleNewChat);


// ─── Startup ──────────────────────────────────────────────────────────────────
async function restoreFromStorage() {
    await fetchConversations();
    const savedId = localStorage.getItem('tla_current_id');
    if (savedId !== null && conversations.has(savedId)) {
        currentConversationId = savedId;
    }
    const isFreshLogin = sessionStorage.getItem('tla_fresh_login') === 'true';
    if (isFreshLogin) {
        sessionStorage.removeItem('tla_fresh_login');
        currentConversationId = null;
    }
    refreshSidebar();
    renderChatArea();
    updateHeaderTitle();
}

restoreFromStorage();


// ─── Correction feedback ──────────────────────────────────────────────────────
const THANKS_DISPLAY_DURATION_MS = 1500;

function sendCorrectionFeedback(messageId, conversationId, correctSolution, query, answer) {
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