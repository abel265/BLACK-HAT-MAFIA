# K Chat – Anonymous Messaging Platform

A real-time anonymous chat platform inspired by the **K** logo (blue → red gradient).

## Features

- **Admin-only account creation** – No public signup. Only the admin can create user accounts.
- **Anonymous messaging** – Usernames are **never** shown in the chat. Only the messages appear.
- **Message alignment**:
  - Your own messages appear on the **left**
  - Incoming messages appear on the **right**
- **Reply by swipe** – Swipe (or drag) any message left/right to reply to it. You can also double-click a message.
- **Admin powers**:
  - Create new user accounts
  - Delete users (and their messages)
  - Change any user’s password
- **Real-time** – Powered by Socket.io
- **Beautiful UI** matching the attached K logo colors

## Default Admin Login

```
Username: admin
Password: admin123
```

**Change this password after first login!**

## How to Run (VS Code)

1. Open the `k-chat` folder in VS Code.
2. Open a terminal (`Ctrl + `` ` or Terminal → New Terminal).
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Open your browser at: **http://localhost:3000**

## Project Structure

```
k-chat/
├── package.json
├── server.js              # Express + Socket.io backend
├── db/
│   └── database.js        # JSON file storage (no database server needed)
├── public/
│   ├── index.html         # Main UI
│   ├── style.css          # K-logo gradient theme
│   └── app.js             # Frontend logic + swipe reply
└── README.md
```

## How to Use

### As Admin
1. Login with `admin` / `admin123`
2. Click the ⚙ gear icon → Admin Panel
3. Create accounts for other people
4. You can change passwords or delete users anytime

### As Regular User
1. Login with the username/password the admin gave you
2. Start chatting – no names are visible
3. To reply: **swipe** a message (mobile) or **drag** it / **double-click** it (desktop)
4. A reply preview appears above the input box

## Notes

- Data is stored in `db/data.json` (created automatically).
- Everything runs locally – no external services required.
- Works on both desktop and mobile browsers.
- The platform is intentionally anonymous: even the admin cannot see who sent which message in the chat UI (only in the database).

Enjoy your K Chat platform!
