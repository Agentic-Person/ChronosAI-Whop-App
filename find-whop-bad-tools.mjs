// find-whop-bad-tools.mjs
import { spawn } from "node:child_process";

const proc = spawn(
  "cmd",
  ["/c", "npx", "-y", "@whop/mcp"],
  {
    stdio: ["pipe", "pipe", "inherit"],
    env: {
      ...process.env,
      // make sure these are in your PowerShell env too
      WHOP_API_KEY: process.env.WHOP_API_KEY,
      WHOP_APP_ID: process.env.WHOP_APP_ID,
    }
  }
);

// MCP uses JSON-RPC over stdio. After the server says "running on stdio",
// we send a tools/list request.
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

// give the server a moment to boot, then send the request
setTimeout(() => {
  proc.stdin.write(JSON.stringify(request) + "\n");
}, 500);

let buffer = "";

proc.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  buffer += text;

  // MCP responses are JSON per line — try to parse each line
  const lines = buffer.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const msg = JSON.parse(trimmed);

      // look for our tools/list response
      if (msg.id === 1 && msg.result && Array.isArray(msg.result.tools)) {
        const tools = msg.result.tools;

        const bad = tools.filter((t) => {
          const s = t.input_schema || {};
          return (
            Object.prototype.hasOwnProperty.call(s, "oneOf") ||
            Object.prototype.hasOwnProperty.call(s, "anyOf") ||
            Object.prototype.hasOwnProperty.call(s, "allOf")
          );
        });

        if (bad.length === 0) {
          console.log("✅ No bad schemas found in Whop MCP.");
        } else {
          console.log("⚠️ Tools with unsupported top-level schema:");
          bad.forEach((t) => console.log(" -", t.name));
        }

        proc.kill();
      }
    } catch (e) {
      // not JSON we care about; ignore
    }
  }
});
