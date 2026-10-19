const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],
  messages: [],
  nextUserId: 1,
  nextMessageId: 1
};

function load() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (e) {
    console.error('DB load error, using defaults');
  }
  return structuredClone(defaultData);
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

let data = load();

// Seed default admin if none exists
if (!data.users.some(u => u.is_admin)) {
  data.users.push({
    id: data.nextUserId++,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    is_admin: true,
    created_at: new Date().toISOString()
  });
  save(data);
  console.log('Default admin created → username: admin | password: admin123');
}

const db = {
  // Users
  getUserByUsername(username) {
    return data.users.find(u => u.username === username) || null;
  },
  getUserById(id) {
    return data.users.find(u => u.id === parseInt(id)) || null;
  },
  getAllUsers() {
    return data.users.map(u => ({
      id: u.id,
      username: u.username,
      is_admin: u.is_admin,
      created_at: u.created_at
    }));
  },
  createUser(username, hashedPassword) {
    if (data.users.some(u => u.username === username)) {
      throw new Error('Username already exists');
    }
    const user = {
      id: data.nextUserId++,
      username,
      password: hashedPassword,
      is_admin: false,
      created_at: new Date().toISOString()
    };
    data.users.push(user);
    save(data);
    return user;
  },
  deleteUser(id) {
    const uid = parseInt(id);
    data.messages = data.messages.filter(m => m.user_id !== uid);
    data.users = data.users.filter(u => u.id !== uid);
    save(data);
  },
  updatePassword(id, hashedPassword) {
    const user = data.users.find(u => u.id === parseInt(id));
    if (user) {
      user.password = hashedPassword;
      save(data);
    }
  },

  // Messages
  getAllMessages() {
    return data.messages.map(m => {
      const reply = m.reply_to
        ? data.messages.find(r => r.id === m.reply_to)
        : null;
      return {
        id: m.id,
        content: m.content,
        user_id: m.user_id,
        reply_to: m.reply_to,
        created_at: m.created_at,
        reply_content: reply ? reply.content : null
      };
    });
  },
  createMessage(userId, content, replyTo) {
    const msg = {
      id: data.nextMessageId++,
      user_id: userId,
      content,
      reply_to: replyTo || null,
      created_at: new Date().toISOString()
    };
    data.messages.push(msg);
    save(data);

    let reply_content = null;
    if (replyTo) {
      const original = data.messages.find(m => m.id === replyTo);
      reply_content = original ? original.content : null;
    }
    return { ...msg, reply_content };
  }
};

module.exports = db;
