import {
  connectTransportController,
  consumeController,
  joinRoomController,
  leaveRoomController,
  produceController,
} from "@controllers/transport";
import { getRoom, getRooms, removeRoom } from "@services/room";
import { Server, Socket } from "socket.io";

export const setupTransportTest2 = async (io: Server, socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  joinRoomController(socket);
  connectTransportController(socket);
  produceController(socket);
  consumeController(socket);
  leaveRoomController(socket);

  socket.on("disconnect", () => {
    const rooms = getRooms();
    for (const [roomId] of rooms) {
      if (roomId !== socket.id) {
        const room = getRoom(roomId);
        if (room) {
          const peer = room.peers.get(socket.id);
          if (peer) {
            [
              ...peer.consumers.values(),
              ...peer.producers.values(),
              ...peer.transports.values(),
            ].forEach((cn) => cn.close());
            room.peers.delete(socket.id);
          }
          socket.leave(roomId);
          socket.to(roomId).emit("peer-left", { peerId: socket.id });
          if (room.peers.size === 0) {
            removeRoom(roomId);
          }
        }
      }
    }
    return { left: true };
  });
};
