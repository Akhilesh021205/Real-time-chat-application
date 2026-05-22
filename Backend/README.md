# Real-time Chat Application Backend

> Backend server for the Real-time Chat Application (Slack-style) built with **Node.js + Express + MongoDB**, supporting **JWT auth via HttpOnly cookies**, and **real-time communication with Socket.IO**.

---

## 🚀 Deployed API

- Backend API: (add your deployment link here)

---

## 🧾 Tech Stack

- **Node.js**
- **Express.js** (REST APIs)
- **MongoDB** + **Mongoose** (data modeling)
- **Socket.IO** (real-time messaging + presence)
- **JWT** (authentication)
- **HttpOnly cookies** (token stored securely)
- **bcryptjs** (password hashing)
- **Passport + Google OAuth** (social login)
- **Cloudinary** (file uploads/media storage)
- **multer** (multipart handling)

---

## 📁 Project Structure

```bash
Backend/
  server.js
  package.json

  APIs/
    authAPI.js
    channelAPI.js
    dmAPI.js
    messageAPI.js
    workspaceAPI.js
    userAPI.js
    fileAPI.js
    notificationAPI.js
    activityAPI.js
    ReminderAPI.js
    ...

  controllers/
    authController.js
    channelController.js
    messageController.js
    workspaceController.js
    fileController.js
    ...

  middleware/
    verifyToken.js

  Models/
    user.js
    workspace.js
    channel.js
    Message.js
    ...

  uploads/  # local upload directory (legacy)
```

---

## ⚙️ Environment Variables

Create a `.env` file in `Backend/`:

```env
PORT=4000

DB_URL=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🔐 Authentication & Authorization

### JWT + HttpOnly Cookies
- Login issues a **JWT** stored in a **HttpOnly cookie** named `token`.
- Protected routes use `verifyToken` middleware.

### Supported Auth Flows
- **Register**
- **Login**
- **Logout** (clears cookie)
- **Google OAuth login**
- **Password reset**:
  - OTP-based reset (email via nodemailer if configured)
  - Also supports a simple reset endpoint

---

## 🧠 Presence (Online/Offline)

Socket.IO events:
- `goOnline` sets a user status to `active` (or keeps `away`/`dnd`)
- `disconnect` updates status to `offline` when no other active sockets exist for that user

User document `status` values:
- `active`, `away`, `dnd`, `offline`

---

## 💬 Messaging (Real-time)

### REST Endpoints
Located under:
- `/api/messages` (upload, send, edit, delete, reactions, threading, marking read)

Core capabilities:
- Channel messages (public + private)
- DM messages (private/direct)
- Thread replies (`parentMessage`)
- Edit/delete (sender-only for edit/delete)
- Reactions
- Pin
- Save/star messages for the user
- Mark room as read

### Socket.IO
Real-time events emit to rooms:
- `newMessage`
- `newReply`
- `messageEdited`
- `messageDeleted`
- `messageReacted`

Rooms:
- Channel rooms use `channelId`
- DM rooms use a stable `roomId` constructed from two userIds

---

## 🧩 Channels & Workspaces (Slack-style)

### Channels
Endpoints under `/api/channels`:
- List my channels and DMs
- Browse public channels
- Create channel
- Join channel (by id / invite code)
- Add members
- Invite code generation/regeneration

### Workspaces
Endpoints under `/api/workspaces`:
- Create workspace
- Update workspace
- Invite user (notification-based)
- Join via invite code
- Connect workspaces (Slack Connect-style)
- Remove member
- Delete workspace
- Leave workspace
- Get workspace members

---

## 📎 File Uploads (Cloudinary)

Endpoints under `/api/files`:
- `POST /upload` (multipart upload)
- `GET /?workspaceId=` to fetch files
- `DELETE /:id` to delete (uploader-only)

Uploads are stored in **Cloudinary** and saved to the `File` model.

---

## 🗺️ API Routes Summary

Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/auth/google`
- `GET  /api/auth/google/callback`
- `POST /api/auth/reset-password`

Core
- `POST /api/messages/send`
- `GET  /api/messages/:channelId`
- `GET  /api/messages/dm/:receiverId`
- `POST /api/messages/upload`
- `PUT  /api/messages/edit/:messageId`
- `DELETE /api/messages/delete/:messageId`

Channels / DMs
- `GET  /api/channels/`
- `GET  /api/channels/browse`
- `POST /api/channels/create`
- `POST /api/channels/join-by-code`
- `POST /api/channels/dm`

Workspaces
- `POST /api/workspaces/create`
- `POST /api/workspaces/invite`
- `GET  /api/workspaces/user`

Files
- `POST /api/files/upload`
- `GET  /api/files/`
- `DELETE /api/files/:id`

---

## 🏁 Running Locally

```bash
npm install
npm run dev
```

For production:

```bash
npm start
```

---

## 🔒 Notes / Security

- Token is stored as **HttpOnly cookie** (reduces XSS token theft risk)
- Protected routes use `verifyToken`
- Messaging actions are restricted (sender-only edit/delete; channel membership checks)

---

