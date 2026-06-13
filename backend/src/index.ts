import "dotenv/config";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import routes from "./routes";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use("/api", routes);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "RetailPOS API Server started");
});

export default app;
