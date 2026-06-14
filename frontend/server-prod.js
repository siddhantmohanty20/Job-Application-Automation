import { createServer } from "node:http";

const serverModule = await import("./dist/server/server.js");

// TanStack Start exports handler as minified 'r' function
const fetchHandler = serverModule.r || serverModule.default?.r;

if (!fetchHandler || typeof fetchHandler !== "function") {
  throw new Error("Could not find fetch handler in server module");
}

const PORT = process.env.PORT || 3000;

createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const url = `http://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : body,
    });

    const response = await fetchHandler(request);

    res.writeHead(response.status, Object.fromEntries(response.headers));
    const buffer = await response.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (e) {
    console.error("[server] Error:", e);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
}).listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});