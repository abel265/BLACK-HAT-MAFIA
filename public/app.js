// ========== STATE ==========
let currentUser = null;
let socket = null;
let replyToId = null;
let replyToContent = null;

// ========== DOM ==========
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const replyPreview = document.getElementById('reply-preview');
const replyText = document.getElementById('reply-text');
const cancelReply = document.getElementById('cancel-reply');
const adminBtn = document.getElementById('admin-btn');
const logoutBtn = document.getElementById('logout-btn');
const backToChat = document.getElementById('back-to-chat');
const createUserForm = document.getElementById('create-user-form');
const createMsg = document.getElementById('create-msg');
const usersList = document.getElementById('users-list');

// ========== LOGIN ==========
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || 'Login failed';
      return;
    }
    currentUser = data;
    startChat();
  } catch (err) {
    loginError.textContent = 'Connection error';
  }
});

function startChat() {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  adminScreen.classList.add('hidden');

  if (currentUser.isAdmin) {
    adminBtn.classList.remove('hidden');
  } else {
    adminBtn.classList.add('hidden');
  }

  // Connect socket
  socket = io();
  socket.emit('join', currentUser);

  socket.on('new-message', (msg) => {
    appendMessage(msg);
    scrollToBottom();
  });

  loadMessages();
  messageInput.focus();
}

// ========== MESSAGES ==========
async function loadMessages() {
  try {
    const res = await fetch('/api/messages');
    const messages = await res.json();
    messagesEl.innerHTML = '';
    messages.forEach(appendMessage);
    scrollToBottom();
  } catch (e) {
    console.error(e);
  }
}

function appendMessage(msg) {
  const isOwn = msg.user_id === currentUser.id;
  const div = document.createElement('div');
  div.className = `message ${isOwn ? 'own' : 'other'}`;
  div.dataset.id = msg.id;

  let html = '';
  if (msg.reply_to && msg.reply_content) {
    html += `<div class="reply-quote">${escapeHtml(msg.reply_content)}</div>`;
  }
  html += `<div class="text">${escapeHtml(msg.content)}</div>`;
  html += `<div class="time">${formatTime(msg.created_at)}</div>`;

  div.innerHTML = html;

  // Swipe / drag to reply
  enableSwipeReply(div, msg);

  messagesEl.appendChild(div);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ========== SEND MESSAGE ==========
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;

  socket.emit('send-message', {
    content,
    replyTo: replyToId
  });

  messageInput.value = '';
  clearReply();
});

// ========== REPLY SYSTEM ==========
function setReply(msg) {
  replyToId = msg.id;
  replyToContent = msg.content || msg.reply_content || '';
  replyText.textContent = replyToContent;
  replyPreview.classList.remove('hidden');
  messageInput.focus();
}

function clearReply() {
  replyToId = null;
  replyToContent = null;
  replyPreview.classList.add('hidden');
  replyText.textContent = '';
}

cancelReply.addEventListener('click', clearReply);

// Swipe / long-press / drag to reply
function enableSwipeReply(el, msg) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;

  // Touch events (mobile swipe)
  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
    el.classList.add('swiping');
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
    const deltaY = Math.abs(e.touches[0].clientY - startY);

    // Only horizontal swipe
    if (deltaY > 30) {
      isDragging = false;
      el.style.transform = '';
      return;
    }

    // Limit swipe distance
    const max = 80;
    const limited = Math.max(-max, Math.min(max, currentX));
    el.style.transform = `translateX(${limited}px)`;

    if (Math.abs(limited) > 40) {
      el.classList.add('swipe-hint');
    } else {
      el.classList.remove('swipe-hint');
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('swiping', 'swipe-hint');

    if (Math.abs(currentX) > 50) {
      setReply(msg);
    }
    el.style.transform = '';
    currentX = 0;
  });

  // Mouse drag (desktop)
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    isDragging = true;
    el.classList.add('swiping');

    const onMove = (ev) => {
      if (!isDragging) return;
      currentX = ev.clientX - startX;
      const limited = Math.max(-80, Math.min(80, currentX));
      el.style.transform = `translateX(${limited}px)`;
      if (Math.abs(limited) > 40) el.classList.add('swipe-hint');
      else el.classList.remove('swipe-hint');
    };

    const onUp = () => {
      isDragging = false;
      el.classList.remove('swiping', 'swipe-hint');
      if (Math.abs(currentX) > 50) setReply(msg);
      el.style.transform = '';
      currentX = 0;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Double-click also works as reply
  el.addEventListener('dblclick', () => setReply(msg));
}

// ========== LOGOUT ==========
logoutBtn.addEventListener('click', () => {
  if (socket) socket.disconnect();
  currentUser = null;
  messagesEl.innerHTML = '';
  clearReply();
  chatScreen.classList.add('hidden');
  adminScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('login-password').value = '';
});

// ========== ADMIN ==========
adminBtn.addEventListener('click', () => {
  chatScreen.classList.add('hidden');
  adminScreen.classList.remove('hidden');
  loadUsers();
});

backToChat.addEventListener('click', () => {
  adminScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
});

createUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createMsg.textContent = '';
  createMsg.className = 'msg';

  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;

  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: currentUser.id,
        username,
        password
      })
    });
    const data = await res.json();
    if (!res.ok) {
      createMsg.textContent = data.error;
      createMsg.classList.add('error');
      return;
    }
    createMsg.textContent = `Account "${username}" created successfully`;
    createMsg.classList.add('success');
    createUserForm.reset();
    loadUsers();
  } catch (err) {
    createMsg.textContent = 'Error creating account';
    createMsg.classList.add('error');
  }
});

async function loadUsers() {
  try {
    const res = await fetch(`/api/admin/users?adminId=${currentUser.id}`);
    const users = await res.json();
    usersList.innerHTML = '';

    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'user-card';

      const isSelf = u.id === currentUser.id;
      const adminBadge = u.is_admin ? ' (Admin)' : '';

      card.innerHTML = `
        <div class="user-info">
          <span class="name">${escapeHtml(u.username)}${adminBadge}</span>
          <span class="meta">ID: ${u.id} · ${new Date(u.created_at).toLocaleDateString()}</span>
        </div>
        <div class="user-actions">
          ${!isSelf ? `
            <button class="change-pw" data-id="${u.id}">Change PW</button>
            <button class="delete" data-id="${u.id}">Delete</button>
          ` : '<span style="opacity:0.5;font-size:12px">You</span>'}
        </div>
      `;

      usersList.appendChild(card);
    });

    // Change password
    usersList.querySelectorAll('.change-pw').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newPw = prompt('Enter new password (min 4 characters):');
        if (!newPw || newPw.length < 4) {
          alert('Password too short');
          return;
        }
        const res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: currentUser.id,
            userId: btn.dataset.id,
            newPassword: newPw
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Password changed successfully');
        } else {
          alert(data.error || 'Failed');
        }
      });
    });

    // Delete user
    usersList.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user and all their messages?')) return;
        const res = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: currentUser.id,
            userId: btn.dataset.id
          })
        });
        if (res.ok) {
          loadUsers();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed');
        }
      });
    });
  } catch (e) {
    console.error(e);
  }
}
