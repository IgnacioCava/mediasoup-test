import { Server } from "socket.io";
import { setupTransportTest2 } from "./events/mediasoup";
import { HTTPSServer } from "@customTypes/socket";

const initSocket = async (server: HTTPSServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "https://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {},
    pingTimeout: 5000,
  });

  io.on("connection", async (socket) => {
    try {
      await setupTransportTest2(io, socket);
    } catch (err) {
      console.error("Error in /sfu connection:", err);
      socket.disconnect();
    }
  });

  return io;
};

export default initSocket;
