import { webRtcTransportOptions } from "@lib/mediasoup/mediasoupConfig";
import { addPeerToRoom, getRoom } from "./room";
import { ConsumeParams, ProduceParams } from "@customTypes/mediasoup";

export const createWebRtcTransport = async (
  roomId: string,
  peerId: string,
  direction: "send" | "recv"
) => {
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found`);
  
  const transport = await room.router.createWebRtcTransport({
    ...webRtcTransportOptions,
    appData: { peerId, direction },
  });

  const peer = addPeerToRoom(roomId, peerId);
  peer.transports.set(transport.id, transport);

  const { id, iceParameters, iceCandidates, dtlsParameters } = transport;

  return {
    id,
    iceParameters,
    iceCandidates,
    dtlsParameters,
  };
};

export const createProducer = async (data: ProduceParams) => {
  const { roomId, peerId, kind, rtpParameters, transportId } = data;
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found`);

  const peer = room.peers.get(peerId);
  if (!peer) throw new Error(`Peer ${peerId} not found`);

  const transport = peer.transports.get(transportId);
  if (!transport) throw new Error("Transport not found");

  const producer = await transport.produce({
    kind,
    rtpParameters,
  });

  peer.producers.set(producer.id, producer);
  console.log(`produce: producer created for user ${peerId}`);

  return producer.id;
};

export const createConsumer = async (data: ConsumeParams) => {
  const { roomId, peerId, producerId, rtpCapabilities, transportId } = data;

  const room = getRoom(roomId);
  if (!room) throw new Error(`Room ${roomId} not found`);

  if (!room.router.canConsume({ producerId, rtpCapabilities }))
    throw new Error(`Cannot consume producer ${producerId}`);

  const peer = room.peers.get(peerId);
  if (!peer) throw new Error(`Peer ${peerId} not found`);

  const transport = peer.transports.get(transportId);
  if (!transport) throw new Error("Transport not found");

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: false,
  });

  peer.consumers.set(consumer.id, consumer);
  const { id, kind, rtpParameters } = consumer;

  return {
    id,
    producerId,
    kind,
    rtpParameters,
  };
};
