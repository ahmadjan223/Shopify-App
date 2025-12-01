import { createRequestListener } from "@react-router/node";
import * as build from "../build/server/index.js";

// Vercel Node.js Serverless Function entrypoint
export default createRequestListener({
  build,
  mode: process.env.NODE_ENV,
});

