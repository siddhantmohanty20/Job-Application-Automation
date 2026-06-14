const serverModule = await import("./dist/server/server.js");

console.log("[debug] Server module exports:", Object.keys(serverModule));
console.log("[debug] Export types:", Object.entries(serverModule).map(([k, v]) => `${k}: ${typeof v}`));

process.exit(0);