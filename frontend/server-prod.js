import { createServer } from "node:http";

const serverModule = await import("./dist/server/server.js");
const fetchHandler = serverModule.r;

if (!fetchHandler || typeof fetchHandler !== "function") {
  throw new Error("Could not find fetch handler");
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
      headers: Object.entries(req.headers)
        .filter(([, v]) => v !== undefined)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
      body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : body,
    });

    const response = await fetchHandler(request);

    // safely convert headers
    const headers = {};
    if (response.headers && typeof response.headers.forEach === "function") {
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (response.headers && typeof response.headers.entries === "function") {
      for (const [key, value] of response.headers.entries()) {
        headers[key] = value;
      }
    }

    res.writeHead(response.status || 200, headers);
    const buffer = await response.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (e) {
    console.error("[server] Error:", e.message);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});