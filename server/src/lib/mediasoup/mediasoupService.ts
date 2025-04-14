import { Workers } from "@customTypes/mediasoup";
import mediasoup from "mediasoup";
import os from "os";

const workers: Workers = [];
let nextWorkerIndex = 0;

const createWorker = async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 6002,
    rtcMaxPort: 6202,
  });

  worker.on("died", () => {
    console.log(`Mediasoup worker died (pid: ${worker.pid})`);
    setTimeout(() => process.exit(1), 2000);
  });

  workers.push({ worker, routers: new Map() });
};

export const getWorker = () => {
  const worker = workers[nextWorkerIndex].worker;
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
};

export const initWorkers = async () => {
  const numWorkers = os.cpus().length;
  for (let i = 0; i < numWorkers; ++i) {
    await createWorker();
  }
};
