import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { handler } = await import("./dist/server/server.js");

const PORT = process.env.PORT || 3000;

createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
}).listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});