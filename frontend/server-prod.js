import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = join(__dirname, "dist", "client");

const serverModule = await import("./dist/server/server.js");
const fetchHandler = serverModule.r;

const PORT = process.env.PORT || 3000;

const MIME = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".txt": "text/plain",
};

createServer(async (req, res) => {
  try {
    const urlPath = req.url?.split("?")[0] || "/";

    // serve static assets from dist/client
    const staticPath = join(clientDir, urlPath);
    if (existsSync(staticPath) && urlPath !== "/") {
      const ext = extname(staticPath);
      const mime = MIME[ext] || "application/octet-stream";
      res.writeHead(200, { "content-type": mime });
      createReadStream(staticPath).pipe(res);
      return;
    }

    // all other requests go through SSR handler
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

    if (typeof response === "string") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(response);
      return;
    }

    if (response && typeof response.text === "function") {
      const headers = {};
      if (response.headers?.forEach) {
        response.headers.forEach((v, k) => { headers[k] = v; });
      }
      res.writeHead(response.status || 200, headers);
      res.end(await response.text());
      return;
    }

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