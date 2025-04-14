"use client";

import { io } from "socket.io-client";

const defaultSocketConfig = {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
};

const sfuSocket = io(
  "https://localhost:5000",
  defaultSocketConfig
);

console.log("Socket instance created");

export const connectSfuSocket = async () => {
  sfuSocket.connect();
};

export { sfuSocket };
