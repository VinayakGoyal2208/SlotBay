// Keep the browser bundle in production mode even when the server .env says development.
process.env.NODE_ENV = "production";
const { build } = await import("vite");
await build();
