import { io } from 'socket.io-client';
import { SOCKET_URL } from "../config/api.js";

export const socket = io(SOCKET_URL, {
  autoConnect: false
});

