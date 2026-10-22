import mongoose from "mongoose";

let connectionPromise;

export function validateServerEnvironment() {
  const problems = [];
  if (!process.env.MONGO_URI) problems.push("MONGO_URI");
  if (!/^[a-f0-9]{64}$/i.test(process.env.DATA_ENCRYPTION_KEY || ""))
    problems.push("DATA_ENCRYPTION_KEY (64 hex characters)");
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    try {
      const url = new URL(process.env.SITE_URL);
      if (url.protocol !== "https:" || url.origin !== process.env.SITE_URL)
        problems.push("SITE_URL (HTTPS origin without a trailing slash)");
    } catch {
      problems.push("SITE_URL (HTTPS origin)");
    }
  }
  if (problems.length) {
    const error = new Error("Configure server settings: " + problems.join(", "));
    error.code = "SERVER_CONFIGURATION_REQUIRED";
    throw error;
  }
}

// Share the initial connection and index setup between concurrent cold-start requests.
// Keep the pool small: Vercel can create more than one function instance.
export async function connectDatabase() {
  validateServerEnvironment();
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: process.env.VERCEL === "1" ? 5 : 20,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 20000,
      });
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      if (!hello.setName && hello.msg !== "isdbgrid")
        throw new Error("MongoDB must be a replica set or sharded cluster");
      for (const model of Object.values(mongoose.models)) await model.init();
      return mongoose;
    })();
  }
  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  connectionPromise = undefined;
});
