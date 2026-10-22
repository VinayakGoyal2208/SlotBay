import { createVercelApp } from "../server/vercel.js";

// A request handler, not the persistent listener in server/index.js.
export default createVercelApp();
