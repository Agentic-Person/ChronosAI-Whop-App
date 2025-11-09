// check-supabase-tools.mjs
import { spawn } from "node:child_process";

console.log("🔍 Checking Supabase MCP server for problematic schemas...\n");

const proc = spawn("npx", ["-y", "@supabase/mcp-server-supabase@latest"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: "sbp_86f37a9af098760663734873dba7ebe6b97ace92"
  }
});

const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

setTimeout(() => {
  proc.stdin.write(JSON.stringify(request) + "\n");
}, 2000);

let buffer = "";

proc.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  buffer += text;

  const lines = buffer.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const msg = JSON.parse(trimmed);

      if (msg.id === 1 && msg.result && Array.isArray(msg.result.tools)) {
        const tools = msg.result.tools;
        console.log(`📊 Supabase MCP: ${tools.length} tools total`);

        const badTools = tools.filter((t) => {
          const s = t.input_schema || {};
          return (
            Object.prototype.hasOwnProperty.call(s, "oneOf") ||
            Object.prototype.hasOwnProperty.call(s, "anyOf") ||
            Object.prototype.hasOwnProperty.call(s, "allOf")
          );
        });

        if (badTools.length === 0) {
          console.log("✅ No bad schemas found in Supabase MCP");
        } else {
          console.log(`⚠️ Found ${badTools.length} tools with problematic schemas:`);
          badTools.forEach((t, i) => {
            console.log(`\n${i + 1}. Tool: ${t.name}`);
            const schema = t.input_schema || {};
            if (schema.oneOf) {
              console.log(`   ❌ Has oneOf with ${schema.oneOf.length} options`);
              console.log(`   Schema preview:`, JSON.stringify(schema, null, 2).substring(0, 200) + "...");
            }
            if (schema.allOf) {
              console.log(`   ❌ Has allOf with ${schema.allOf.length} schemas`);
            }
            if (schema.anyOf) {
              console.log(`   ❌ Has anyOf with ${schema.anyOf.length} options`);
            }
          });
          
          // Check if tool #3 or #4 (which would be #76 overall) is problematic
          console.log(`\n🎯 Checking if tool #76 overall is problematic...`);
          const toolIndex76 = 2; // 76 - 74 = 2 (0-indexed, so index 2 = 3rd tool)
          if (tools[toolIndex76]) {
            const tool76 = tools[toolIndex76];
            console.log(`Tool #76 is: ${tool76.name}`);
            const schema76 = tool76.input_schema || {};
            if (schema76.oneOf || schema76.allOf || schema76.anyOf) {
              console.log(`🚨 FOUND IT! Tool #76 (${tool76.name}) has problematic schema!`);
            } else {
              console.log(`✅ Tool #76 (${tool76.name}) schema looks fine`);
            }
          }
        }

        proc.kill();
      }
    } catch (e) {
      // not JSON we care about
    }
  }
});

proc.on("error", (err) => {
  console.log(`❌ Error: ${err.message}`);
});

setTimeout(() => {
  console.log("⏰ Timeout - killing process");
  proc.kill();
}, 15000);
