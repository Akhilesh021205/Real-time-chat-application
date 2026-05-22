# 💬 Real-Time Slack Clone (Frontend)

A modern, fully responsive **Slack-style real-time chat frontend** built with **React + Vite + Tailwind CSS**, featuring authentication, protected routes, and live updates via **Socket.IO**.

> This frontend connects to the backend using secure, cookie-based sessions and a configurable API base URL.

---

## 🚀 Live Deployment

 Frontend App  —  (add your Vercel/hosting link here) 

---

## ✨ Features

### 🔐 Authentication & Security
- User Login & Registration
- Persistent authentication (cookie-based)
- **Protected routes** (public vs authenticated areas)
- Secure API communication (`withCredentials: true`)
- Theme support (light/dark/system)

### 💬 Real-time Chat
- Live presence updates
- Real-time messaging via **Socket.IO**
- Channel-based chat
- Direct messaging (DMs)

### 🧰 Workspace Management
- Create/Join workspaces
- Invite members
- Channel creation and management
- Workspace members & settings

### 🗂️ Files & Attachments
- File upload support (frontend UI for attachments)
- Attachment preview components

### 🎛️ Modern UI/UX
- Mobile-first responsive layout
- Glassmorphism/gradient styling
- Smooth component interactions
- Sidebar + thread-style navigation layout

---

## 🛠️ Tech Stack

| Technology | Purpose |
| ---------- | ------- |
| React | UI layer & components |
| Vite | Fast dev server + production builds |
| Tailwind CSS | Responsive design + utility styling |
| React Router | Client-side routing |
| Axios | API requests |
| Socket.IO Client | Real-time updates |

---

## 📂 Project Structure

```bash
frontend/
│
├── public/
│   └── slackbot-icon.png (assets)
│
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── MessageInput.jsx
│   │   ├── Modals (Modal.jsx, EditProfileModal.jsx, SettingsModal.jsx, ...)
│   │   └── AttachmentPreview.jsx
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── WorkspaceContext.jsx
│   │
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Home.jsx
│   │   ├── Chat.jsx
│   │   ├── DMs.jsx
│   │   ├── Files.jsx
│   │   ├── Workspaces.jsx
│   │   └── ...
│   │
│   ├── socket/
│   │   └── socket.js
│   │
│   ├── utils/
│   │   ├── presence.js
│   │   ├── fileHelpers.js
│   │   └── ...
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── vite.config.js
├── index.html
├── package.json
└── tailwind.config.js
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `frontend/` folder.



## 🚀 Getting Started

### 1) Install Dependencies
```bash
cd frontend
npm install
```

### 2) Start Development Server
```bash
npm run dev
```

### 3) Build for Production
```bash
npm run build
```

### 4) Preview Production Build
```bash
npm run preview
```

---

## 🔌 API & Credentials

The frontend uses cookie-based sessions.
- `withCredentials: true` is used on Axios requests.
- `credentials: 'include'` is used for fetch calls.

Ensure the backend supports:
- CORS with credentials
- cookie session handling

---

## 🧪 Testing & Debugging Notes
- If protected routes don’t load, verify `VITE_API_URL` and that cookies are accepted by your browser.
- If real-time messaging/presence doesn’t update, verify Socket.IO connection settings in `src/socket/socket.js` and backend Socket.IO CORS.

---

## 🤝 Contribution

```bash
# Create a new feature branch
git checkout -b feature-name

# Commit changes
git commit -m "Added feature"

# Push branch
git push origin feature-name
```
