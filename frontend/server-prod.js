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

    // handler returns a plain HTML string
    if (typeof response === "string") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(response);
      return;
    }

    // handler returns a Response object
    if (response && typeof response.text === "function") {
      const headers = {};
      if (response.headers?.forEach) {
        response.headers.forEach((v, k) => { headers[k] = v; });
      }
      res.writeHead(response.status || 200, headers);
      const text = await response.text();
      res.end(text);
      return;
    }

    // fallback
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(String(response));
  } catch (e) {
    console.error("[server] Error:", e.message);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
}).listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});