"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  connectSfuSocket,
  sfuSocket
} from "../lib/socket";

const SocketContext = createContext(undefined);

export const SocketProvider = ({ children }) => {
  const [sfuIsConnected, setSfuIsConnected] = useState(false);
  const [sfuTransport, setSfuTransport] = useState("N/A");

  useEffect(() => {
    initiateSfuSocket()
    return () => {
      sfuSocket.off("connect");
      sfuSocket.off("disconnect");
      sfuSocket.disconnect();
    };
  }, []);

  const initiateSfuSocket = async () => {
    function onConnect() {
      setSfuIsConnected(true);
      setSfuTransport(sfuSocket.io.engine.transport.name);
      sfuSocket.io.engine.on("upgrade", (transport) => {
        setSfuTransport(transport.name);
      });
    }

    function onDisconnect() {
      setSfuIsConnected(false);
      setSfuTransport("N/A");
    }
    await connectSfuSocket();
    sfuSocket.on("connect", onConnect);
    sfuSocket.on("disconnect", onDisconnect);
  };

  const disconnectSfuSocket = async () => {
    sfuSocket.disconnect();
  };

  return (
    <SocketContext.Provider
      value={{
        sfuTransport,
        sfuIsConnected,
        initiateSfuSocket,
        disconnectSfuSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
