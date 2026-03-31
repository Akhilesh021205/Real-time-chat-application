import { io } from 'socket.io-client';

// Point this to your backend Socket.IO server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

