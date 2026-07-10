const STORAGE_KEYS = {
  apiBaseUrl: 'talkto-api-base',
  token: 'talkto-token',
  userId: 'talkto-user-id',
};

const state = {
  apiBaseUrl: localStorage.getItem(STORAGE_KEYS.apiBaseUrl) || 'https://api.talkto.mfos.store',
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  userId: localStorage.getItem(STORAGE_KEYS.userId) || '',
  contacts: [],
  chats: [],
  statuses: [],
  calls: [],
  groups: [],
  messages: [],
  activeView: 'contacts',
  activeContactId: '',
};

const elements = {
  loginForm: document.getElementById('loginForm'),
  authMessage: document.getElementById('authMessage'),
  dashboard: document.getElementById('dashboard'),
  viewContent: document.getElementById('viewContent'),
  userLabel: document.getElementById('userLabel'),
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  saveBaseUrl: document.getElementById('saveBaseUrl'),
  logoutBtn: document.getElementById('logoutBtn'),
  tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
};

function setMessage(text, isError = false) {
  elements.authMessage.textContent = text;
  elements.authMessage.classList.toggle('error', isError);
}

function getApiUrl(path) {
  return `${state.apiBaseUrl.replace(/\/$/, '')}${path}`;
}

async function request(path, options = {}) {
  const headers = {};
  const auth = options.auth !== false;

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(getApiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Request failed');
  }

  return data;
}

function persistSession() {
  localStorage.setItem(STORAGE_KEYS.apiBaseUrl, state.apiBaseUrl);
  localStorage.setItem(STORAGE_KEYS.token, state.token);
  localStorage.setItem(STORAGE_KEYS.userId, state.userId);
}

function clearSession() {
  state.token = '';
  state.userId = '';
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.userId);
  elements.dashboard.hidden = true;
  elements.userLabel.textContent = 'Signed in';
  setMessage('');
  elements.viewContent.innerHTML = '';
}

function renderAuthState() {
  if (state.token) {
    elements.dashboard.hidden = false;
    elements.userLabel.textContent = state.userId ? `Signed in as ${state.userId}` : 'Signed in';
  } else {
    elements.dashboard.hidden = true;
    elements.userLabel.textContent = 'Signed in';
  }
}

function activateTab(view) {
  state.activeView = view;
  elements.tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function renderSection(title, content) {
  elements.viewContent.innerHTML = `
    <div class="section-card">
      <h3>${title}</h3>
      ${content}
    </div>
  `;
}

function createList(items, emptyText) {
  if (!items.length) {
    return `<p>${emptyText}</p>`;
  }

  return `
    <ul class="list">
      ${items.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

async function init() {
  elements.apiBaseUrl.value = state.apiBaseUrl;
  renderAuthState();

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.loginForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: payload,
        auth: false,
      });

      state.token = data.access_token;
      state.userId = data.user_id;
      persistSession();
      renderAuthState();
      setMessage('Login successful.');
      await renderView('contacts');
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  elements.saveBaseUrl.addEventListener('click', () => {
    state.apiBaseUrl = elements.apiBaseUrl.value.trim();
    persistSession();
    setMessage(`API base updated to ${state.apiBaseUrl}`);
  });

  elements.logoutBtn.addEventListener('click', async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error.message);
    }

    clearSession();
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      renderView(button.dataset.view);
    });
  });

  if (state.token) {
    try {
      await request('/auth/validate');
      await renderView(state.activeView);
    } catch (error) {
      clearSession();
    }
  }
}

async function renderView(view) {
  activateTab(view);

  if (!state.token) {
    elements.viewContent.innerHTML = '<p>Log in to use the dashboard.</p>';
    return;
  }

  try {
    if (view === 'contacts') {
      await loadContacts();
    } else if (view === 'chats') {
      await loadChats();
    } else if (view === 'statuses') {
      await loadStatuses();
    } else if (view === 'calls') {
      await loadCalls();
    } else if (view === 'groups') {
      await loadGroups();
    }
  } catch (error) {
    renderSection('Error', `<p>${error.message}</p>`);
  }
}

async function loadContacts() {
  const data = await request('/contacts');
  state.contacts = data.contacts || [];

  const items = state.contacts.map((contact) => `
    <li>
      <div>
        <strong>${contact.nickname}</strong>
        <small>${contact.id}</small>
      </div>
      <button class="secondary" type="button" data-open-chat="${contact.id}">Open chat</button>
    </li>
  `);

  renderSection('Contacts', `
    <form id="addContactForm" class="inline-form">
      <input name="contact_number" placeholder="Phone number" required />
      <input name="nickname" placeholder="Nickname" required />
      <button type="submit">Add contact</button>
    </form>
    <ul class="list">${items.join('') || '<li>No contacts yet.</li>'}</ul>
  `);

  document.getElementById('addContactForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      await request('/contacts', { method: 'POST', body: payload });
      await loadContacts();
      setMessage('Contact added.');
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  document.querySelectorAll('[data-open-chat]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeContactId = button.dataset.openChat;
      renderView('chats');
    });
  });
}

async function loadChats() {
  const data = await request('/chats/users');
  state.chats = data.users || [];

  const items = state.chats.map((chat) => `
    <li>
      <div>
        <strong>${chat.name}</strong>
        <small>${chat.last_message || 'No messages yet'}</small>
      </div>
      <button class="secondary" type="button" data-open-chat="${chat.id}">Open</button>
    </li>
  `);

  renderSection('Chats', `
    <ul class="list">${items.join('') || '<li>No chats yet.</li>'}</ul>
  `);

  document.querySelectorAll('[data-open-chat]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.activeContactId = button.dataset.openChat;
      await loadChatThread(state.activeContactId);
    });
  });

  if (state.activeContactId) {
    await loadChatThread(state.activeContactId);
  }
}

async function loadChatThread(contactId) {
  const data = await request(`/chats/${contactId}/messages`);
  const messages = (data.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  state.messages = messages;

  const thread = messages.length
    ? messages.map((message) => `
        <div class="chat-bubble ${message.sender === 'me' ? 'me' : ''}">
          <strong>${message.sender === 'me' ? 'You' : 'Them'}</strong>
          <div>${message.content || '[attachment]'}</div>
          <small>${message.formatted_time || ''}</small>
        </div>
      `).join('')
    : '<p>No messages yet.</p>';

  renderSection('Conversation', `
    <form id="sendMessageForm" class="inline-form">
      <input name="content" placeholder="Type a message" required />
      <button type="submit">Send</button>
    </form>
    <div class="chat-thread">${thread}</div>
  `);

  document.getElementById('sendMessageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const content = formData.get('content')?.toString().trim();

    if (!content) {
      return;
    }

    try {
      await request(`/chats/${contactId}/messages`, {
        method: 'POST',
        body: { content },
      });
      event.target.reset();
      await loadChatThread(contactId);
      setMessage('Message sent.');
    } catch (error) {
      setMessage(error.message, true);
    }
  });
}

async function loadStatuses() {
  const data = await request('/statuses');
  state.statuses = data.statuses || [];
  const items = state.statuses.map((status) => `
    <li>
      <div>
        <strong>${status.name}</strong>
        <small>${status.content || 'Media status'}</small>
      </div>
      <span>${status.status_type}</span>
    </li>
  `);

  renderSection('Statuses', createList(items, 'No visible statuses yet.'));
}

async function loadCalls() {
  const data = await request('/calls');
  state.calls = data.calls || [];
  const items = state.calls.map((call) => `
    <li>
      <div>
        <strong>${call.name}</strong>
        <small>${call.type} · ${call.status}</small>
      </div>
      <span>${call.duration_seconds}s</span>
    </li>
  `);

  renderSection('Calls', createList(items, 'No call history yet.'));
}

async function loadGroups() {
  const data = await request('/groups');
  state.groups = data.groups || [];
  const items = state.groups.map((group) => `
    <li>
      <div>
        <strong>${group.name}</strong>
        <small>${group.description || 'No description'}</small>
      </div>
      <span>${group.members_count} members</span>
    </li>
  `);

  renderSection('Groups', `
    <form id="addGroupForm" class="inline-form">
      <input name="name" placeholder="Group name" required />
      <input name="description" placeholder="Description" />
      <button type="submit">Create group</button>
    </form>
    ${createList(items, 'No groups yet.')}
  `);

  document.getElementById('addGroupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      await request('/groups', { method: 'POST', body: payload });
      event.target.reset();
      await loadGroups();
      setMessage('Group created.');
    } catch (error) {
      setMessage(error.message, true);
    }
  });
}

window.addEventListener('DOMContentLoaded', init);
