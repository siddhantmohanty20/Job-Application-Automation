import { createServer } from "node:http";

const serverModule = await import("./dist/server/server.js");

// TanStack Start exports a fetch-based handler
// try common export names
const fetchHandler =
  serverModule.handler ||
  serverModule.default ||
  serverModule.fetch ||
  Object.values(serverModule).find((v) => typeof v === "function");

if (!fetchHandler) {
  console.error("Available exports:", Object.keys(serverModule));
  throw new Error("Could not find handler export in dist/server/server.js");
}

const PORT = process.env.PORT || 3000;

createServer(async (req, res) => {
  try {
    // convert Node.js request to Fetch API Request
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

    // convert Fetch API Response back to Node.js response
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