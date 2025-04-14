import {
  IConnectTransportEventArgs,
  IConsumeEventArgs,
  IJoinRoomEventArgs,
  IProduceEventArgs
} from "@customTypes/mediasoup";
import { createRoom, getRoom, removeRoom } from "@services/room";
import {
  createConsumer,
  createProducer,
  createWebRtcTransport,
} from "@services/transport";
import type { Socket } from "socket.io";

export const joinRoomController = async (socket: Socket) => {
  socket.on("join-room", async (args: IJoinRoomEventArgs, callback) => {
    const { peerId, roomId } = args;

    try {
      if (!peerId || !roomId) throw new Error("Unauthorized");

      await createRoom(roomId);

      const sendTransportOptions = await createWebRtcTransport(
        roomId,
        peerId,
        "send"
      );

      const recvTransportOptions = await createWebRtcTransport(
        roomId,
        peerId,
        "recv"
      );

      socket.join(roomId);

      const room = getRoom(roomId);
      const remotePeerIds = [...room?.peers.keys()];

      const existingProducers = [];

      for (const [remotePeerId, peer] of room.peers) {
        if (remotePeerId !== peerId) {
          for (const producer of peer.producers.values()) {
            existingProducers.push({
              producerId: producer.id,
              peerId: remotePeerId,
              kind: producer.kind,
            });
          }
        }
      }

      socket.emit("update-peer-list", { peerIds: remotePeerIds });

      socket.to(roomId).emit("new-peer", { peerId });
      console.log(`join-room: ${socket.id} joined and created transports`);

      callback({
        sendTransportOptions,
        recvTransportOptions,
        peerIds: remotePeerIds,
        rtpCapabilities: room.router.rtpCapabilities,
        existingProducers,
      });
    } catch (error: any) {
      console.log("Error @join-room:", error.message);
      callback({ error: error.message });
    }
  });
};

export const connectTransportController = async (socket: Socket) => {
  socket.on("connect-transport", async (args: IConnectTransportEventArgs, callback) => {
    const { dtlsParameters, peerId, roomId, transportId } = args;
    try {
      if (!socket.id) throw new Error("Unauthorized");

      const room = getRoom(roomId);
      const peer = room?.peers.get(peerId);
      if (!peer) throw new Error("Peer not found");

      const transport = peer.transports.get(transportId);
      if (!transport) throw new Error("Transport not found");

      await transport.connect({ dtlsParameters });
      console.log(`connect-transport: transport connected for user ${peerId}`);
      callback({ connected: true })
    } catch (error: any) {
      callback({error: error.message})
    }
  });
};

export const produceController = async (socket: Socket) => {
  socket.on("produce", async (args: IProduceEventArgs, callback) => {
    const { kind, peerId, roomId, rtpParameters, transportId } = args;
    try {
      if (!roomId || !peerId) throw new Error("Unauthorized");
      const producerId = await createProducer({
        roomId,
        peerId,
        transportId,
        kind,
        rtpParameters,
      });

      socket.to(roomId).emit("new-producer", { producerId, peerId, kind });
      callback({ producerId })
    } catch (error: any) {
      callback({ error: error.message })
    }
  });
};

export const consumeController = async (socket: Socket) => {
  socket.on("consume", async (args: IConsumeEventArgs, callback) => {
    const { peerId, producerId, roomId, rtpCapabilities, transportId } = args;
    try {
      if (!roomId || !peerId) throw new Error("Unauthorized");

      const consumerData = await createConsumer({
        roomId,
        peerId,
        transportId,
        producerId,
        rtpCapabilities,
      });
      callback(consumerData);
    } catch (error: any) {
      console.log("Error consume:", error);
      callback({ error: error.message });
    }
  });
};

export const leaveRoomController = (socket: Socket) => {
  socket.on("leave-room", (callback) => {
    const rooms = Array.from(socket.rooms);

    for (const roomId of rooms) {
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
            room.peers.delete(peer.id);
          }
          socket.leave(roomId);
          socket.to(roomId).emit("peer-left", { peerId: socket.id });

          if (room.peers.size === 0) {
            removeRoom(roomId);
          }
        }
      }
    }

    callback();
  });
};
