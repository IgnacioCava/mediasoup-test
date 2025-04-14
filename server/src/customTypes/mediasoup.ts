import {
  DtlsParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
} from "mediasoup/node/lib/types";
import type { Socket } from "socket.io";

export type Workers = {
  worker: Worker;
  routers: Map<string, Router>;
}[];

export interface Peer {
  id: string;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

export interface Room {
  id: string;
  router: Router;
  peers: Map<string, Peer>;
}

export interface IDefaultEventArgs {
  roomId: string;
  peerId: string;
}

export interface SocketArg {
  socket: Socket;
}

export type IJoinRoomEventArgs = IDefaultEventArgs;

export interface IConnectTransportEventArgs extends IDefaultEventArgs {
  dtlsParameters: DtlsParameters;
  transportId: string;
}

export interface IProduceEventArgs extends IDefaultEventArgs {
  kind: MediaKind;
  transportId: string;
  rtpParameters: RtpParameters;
}

export interface IConsumeEventArgs extends IDefaultEventArgs {
  transportId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

export interface ProduceParams {
  roomId: string;
  peerId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
  transportId: string;
}

export interface ConsumeParams {
  roomId: string;
  peerId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
  transportId: string;
}
