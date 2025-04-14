"use client"; // Ensure this is a client-side component

import { SocketProvider } from "./SocketProvider";
import React from "react";

const SessionWrapper = ({ children }) => {
  return <SocketProvider>{children}</SocketProvider>;
};

export default SessionWrapper;
