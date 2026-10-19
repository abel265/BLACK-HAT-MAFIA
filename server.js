const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== AUTH ==========
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({
    id: user.id,
    username: user.username,
    isAdmin: !!user.is_admin
  });
});

// ========== ADMIN ROUTES ==========
app.post('/api/admin/create-user', (req, res) => {
  const { adminId, username, password } = req.body;
  const admin = db.getUserById(adminId);
  if (!admin || !admin.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const user = db.createUser(username, hashed);
    res.json({ success: true, id: user.id });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Username already exists' });
  }
});

app.get('/api/admin/users', (req, res) => {
  const { adminId } = req.query;
  const admin = db.getUserById(adminId);
  if (!admin || !admin.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  res.json(db.getAllUsers());
});

app.post('/api/admin/delete-user', (req, res) => {
  const { adminId, userId } = req.body;
  const admin = db.getUserById(adminId);
  if (!admin || !admin.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  if (parseInt(userId) === parseInt(adminId)) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.deleteUser(userId);
  res.json({ success: true });
});

app.post('/api/admin/change-password', (req, res) => {
  const { adminId, userId, newPassword } = req.body;
  const admin = db.getUserById(adminId);
  if (!admin || !admin.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.updatePassword(userId, hashed);
  res.json({ success: true });
});

// ========== MESSAGES ==========
app.get('/api/messages', (req, res) => {
  res.json(db.getAllMessages());
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (user) => {
    socket.user = user;
    socket.join('chat');
  });

  socket.on('send-message', (data) => {
    if (!socket.user) return;
    const { content, replyTo } = data;
    if (!content || !content.trim()) return;

    const msg = db.createMessage(socket.user.id, content.trim(), replyTo || null);
    io.to('chat').emit('new-message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 K-Chat running at http://localhost:${PORT}`);
  console.log('Default admin → username: admin | password: admin123\n');
});
