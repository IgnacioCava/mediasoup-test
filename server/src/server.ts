import express, { Express } from "express";
import https from "https";
import cors from "cors";
import dotenv from "dotenv";
import initSocket from "@socket";
import fs from "fs";
import path from "path";
import { initWorkers } from "@lib/mediasoup/mediasoupService";

dotenv.config();
try {
  // Start mediasoup workers
  initWorkers();

  //Start express server
  const app: Express = express();

  app.use(
    cors({
      origin: "https://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/", (_, res) => {
    res.send("Backend is running");
  });

  if (
    !fs.existsSync("src/certs/cert-key.pem") ||
    !fs.existsSync("src/certs/cert.pem")
  ) {
    throw "Missing cert files! Check the README on how to create them";
  }

  // Create HTTPS server
  const key = fs.readFileSync("src/certs/cert-key.pem");
  const cert = fs.readFileSync("src/certs/cert.pem");

  const server = https.createServer({ key, cert }, app);

  const PORT = 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // Start socket
  initSocket(server);
} catch (error) {
  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${red}❌ ${error} ${reset}`);
}
