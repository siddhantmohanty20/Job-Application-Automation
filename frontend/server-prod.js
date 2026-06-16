import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const clientDir = join(__dirname, "dist", "client");

// serve static assets
app.use(express.static(clientDir));

// SPA fallback — all routes serve index.html
app.get("*", (req, res) => {
  res.sendFile(join(clientDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[frontend] Server running on port ${PORT}`);
});