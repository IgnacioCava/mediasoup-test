import { DefaultEventsMap, Namespace, Server, Socket } from "socket.io";
import http from 'http'
import https from 'https'

export type HTTPSServer = https.Server<
  typeof http.IncomingMessage,
  typeof http.ServerResponse
>;

export type SocketServer = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;