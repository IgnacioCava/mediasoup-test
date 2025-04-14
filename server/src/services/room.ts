import { getWorker } from "@lib/mediasoup/mediasoupService";
import { mediaCodecs } from "@lib/mediasoup/mediasoupConfig";
import { Room } from "@customTypes/mediasoup";

export const rooms = new Map<string, Room>();

export const createRoom = async (roomId: string) => {
  try {
    if (rooms.has(roomId)) return rooms.get(roomId);

    const worker = getWorker();
    const router = await worker.createRouter({ mediaCodecs });
    const newRoom: Room = {
      id: roomId,
      router,
      peers: new Map(),
    };

    rooms.set(roomId, newRoom);

    console.log(`Router created for room ${roomId}`);

    return newRoom;
  } catch (error) {
    console.log("Error @createRoom", error);
  }
};

export const getRooms = () => {
  return rooms;
};

export const getRoom = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room) throw new Error("Room not found");
  return room;
};

export const removeRoom = (roomId: string) => {
  rooms.delete(roomId);
};

export const addPeerToRoom = (roomId: string, peerId: string) => {
  const room = rooms.get(roomId);
  if (!room) throw new Error("Room not found");
  if (!room.peers.has(peerId)) {
    room.peers.set(peerId, {
      id: peerId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    });
  }
  const peer = room.peers.get(peerId);
  if (!peer) throw new Error(`Error adding peer ${peerId} to room ${roomId}`);
  return peer;
};

export const removePeerToRoom = (roomId: string, peerId: string) => {
  const room = rooms.get(roomId);
  if (!room) throw new Error("Room not found");
  if (room) {
    room.peers.delete(peerId);
  }
};
