# Real-time Chat Application (Slack-style)

A full-stack, Slack-inspired real-time chat app with:
- **Backend**: Node.js + Express + MongoDB + Socket.IO (JWT via **HttpOnly cookies**)
- **Frontend**: React + Vite + Tailwind CSS + Socket.IO client

---

## 🕒 What is a Real-time Chat App?

This application provides **instant messaging** where messages appear for other users immediately—without page refresh—using **Socket.IO**.

Key real-time behaviors:
- **Broadcasting**: new messages and replies are pushed to the relevant channel/DM participants.
- **Live presence**: users go **online/offline** as their socket connections change.
- **Real-time updates**: edits, deletes, and reactions are reflected instantly.

---

## 🚀 Deployment

### Backend
The backend is deployed on Render and handles:
- User authentication (JWT + Google OAuth)
- Real-time messaging with Socket.IO
- Channel & workspace management
- File uploads and cloud storage integration

🔗 **Backend API**:  
https://real-time-chat-application-5dld.onrender.com

---

### Frontend
The frontend is deployed on Vercel with a responsive modern UI inspired by Slack.

Features include:
- Real-time chat
- Direct messages
- Workspace & channel system
- Huddles/voice room support
- Google Sign-In
- Mobile responsive design

🔗 **Web App**:  
https://real-time-chat-application-frontend-nine.vercel.app

### Socket.IO note
Socket.IO requires the backend to be reachable by the frontend and CORS/cookie settings to be configured for your deployed domains.

---

## 📌 What’s Included

### ✅ Real-time messaging
- Channel chat + DMs
- Message edit/delete (permission checks)
- Threads / replies
- Reactions

### ✅ Presence (online/offline)
- Socket.IO-driven presence updates

### ✅ Workspaces & channels
- Create/join workspaces
- Create/join channels
- Invite members

### ✅ File uploads
- Upload attachments via **Cloudinary**

---

## 🚀 Repo Structure

```text
Real-time-chat-application-main/
  Backend/   # Express API + Socket.IO server
  frontend/  # React + Vite UI
```

---

## 👋 How We Started

This project was created to build a **real-time communication experience** similar to Slack—so we focused on:
- A responsive **React** UI for chat/workspace navigation
- A **Socket.IO** backend to deliver instant message delivery and **presence**
- Secure auth using **JWT stored in HttpOnly cookies**

The goal: a full-stack app where messages update instantly and users feel “connected” in real time.

---

## 🧠 Prerequisites

- Node.js (LTS recommended)
- MongoDB (local or hosted)
- A Google OAuth app (optional, only if you enable Google login)
- Cloudinary credentials (only if you enable file upload)

---

## ⚙️ Environment Variables

### Backend
Create `Backend/.env` (copy values from template in `Backend/README.md`):
- `PORT`
- `DB_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional)
- `EMAIL_USER`, `EMAIL_PASS` (optional)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional)

### Frontend
Create `frontend/.env` (see `frontend/README.md` for expected variables such as the API base URL).

> Important: the frontend uses **cookie-based auth**, so ensure your backend CORS allows credentials and your cookie settings work for your deployment domain.

---

## ▶️ Run Locally (Development)

### 1) Start Backend
```bash
cd Backend
npm install
npm run dev
```

### 2) Start Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Building / Production

### Backend
```bash
cd Backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run preview
```

---

## 🔌 API & Socket Behavior

Backend exposes REST endpoints under `/api/*` and emits Socket.IO events to channel/DM rooms.

For details, refer to:
- `Backend/README.md`
- the API routes under `Backend/APIs/`

---

## 📚 Learn More

- **Backend documentation**: `Backend/README.md`
- **Frontend documentation**: `frontend/README.md`

---

## ✅ Notes / Security Highlights

- JWT stored in an **HttpOnly cookie**
- Protected routes use token verification middleware
- Messaging actions require membership/ownership checks
-messaging actions require membership/ownership checks
---
