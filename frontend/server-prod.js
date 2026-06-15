import { createServer } from "node:http";

const serverModule = await import("./dist/server/server.js");
const fetchHandler = serverModule.r;

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

    // debug — log what response actually is
    console.log("[debug] response type:", typeof response);
    console.log("[debug] response keys:", response ? Object.keys(response) : "null");
    console.log("[debug] response constructor:", response?.constructor?.name);
    console.log("[debug] is Response:", response instanceof Response);
    console.log("[debug] has body:", "body" in (response || {}));
    console.log("[debug] has text:", typeof response?.text);
    console.log("[debug] has arrayBuffer:", typeof response?.arrayBuffer);
    console.log("[debug] status:", response?.status);

    res.writeHead(200, { "content-type": "text/plain" });
    res.end("debug mode - check logs");
  } catch (e) {
    console.error("[server] Error:", e.message);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});