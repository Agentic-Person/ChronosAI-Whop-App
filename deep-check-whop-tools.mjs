// deep-check-whop-tools.mjs
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

console.log("🔍 Deep checking Whop MCP server for problematic schemas...\n");

const proc = spawn("cmd", ["/c", "npx", "-y", "@whop/mcp"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    WHOP_API_KEY: "0u_46cKC_VSlKurR5yvKTiPBY_vfEkmmxKpS5-ztfkQ",
    WHOP_APP_ID: "app_p2sU9MQCeFnT4o"
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
}, 1000);

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
        console.log(`📊 Found ${tools.length} tools in Whop MCP\n`);

        // Check for top-level oneOf/allOf/anyOf
        const topLevelBad = tools.filter((t) => {
          const s = t.input_schema || {};
          return (
            Object.prototype.hasOwnProperty.call(s, "oneOf") ||
            Object.prototype.hasOwnProperty.call(s, "anyOf") ||
            Object.prototype.hasOwnProperty.call(s, "allOf")
          );
        });

        // Check for nested oneOf/allOf/anyOf in properties
        const nestedBad = tools.filter((t) => {
          const s = t.input_schema || {};
          if (!s.properties) return false;
          
          const checkNested = (obj) => {
            if (typeof obj !== 'object' || obj === null) return false;
            if (Object.prototype.hasOwnProperty.call(obj, "oneOf") ||
                Object.prototype.hasOwnProperty.call(obj, "anyOf") ||
                Object.prototype.hasOwnProperty.call(obj, "allOf")) {
              return true;
            }
            for (const key in obj) {
              if (checkNested(obj[key])) return true;
            }
            return false;
          };
          
          return checkNested(s.properties);
        });

        // Specifically check tool #76 (index 75, 0-indexed)
        const tool76 = tools[75];
        if (tool76) {
          console.log(`🎯 Tool #76 Details:`);
          console.log(`   Name: ${tool76.name}`);
          console.log(`   Description: ${tool76.description?.substring(0, 100)}...`);
          
          const schema76 = tool76.input_schema || {};
          console.log(`\n   Input Schema Structure:`);
          console.log(`   - type: ${schema76.type || 'N/A'}`);
          console.log(`   - properties: ${schema76.properties ? Object.keys(schema76.properties).length + ' properties' : 'none'}`);
          console.log(`   - oneOf: ${schema76.oneOf ? 'YES ⚠️' : 'no'}`);
          console.log(`   - allOf: ${schema76.allOf ? 'YES ⚠️' : 'no'}`);
          console.log(`   - anyOf: ${schema76.anyOf ? 'YES ⚠️' : 'no'}`);
          
          if (schema76.oneOf || schema76.allOf || schema76.anyOf) {
            console.log(`\n🚨 FOUND IT! Tool #76 has top-level oneOf/allOf/anyOf!`);
            console.log(`\nFull schema:`, JSON.stringify(schema76, null, 2));
          } else {
            // Check nested
            if (schema76.properties) {
              for (const [propName, propSchema] of Object.entries(schema76.properties)) {
                if (propSchema && (
                  Object.prototype.hasOwnProperty.call(propSchema, "oneOf") ||
                  Object.prototype.hasOwnProperty.call(propSchema, "allOf") ||
                  Object.prototype.hasOwnProperty.call(propSchema, "anyOf")
                )) {
                  console.log(`\n⚠️ Found nested oneOf/allOf/anyOf in property: ${propName}`);
                  console.log(`Property schema:`, JSON.stringify(propSchema, null, 2));
                }
              }
            }
          }
        }

        if (topLevelBad.length > 0) {
          console.log(`\n⚠️ Found ${topLevelBad.length} tools with TOP-LEVEL problematic schemas:`);
          topLevelBad.forEach((t, i) => {
            console.log(`   ${i + 1}. ${t.name}`);
          });
        }

        if (nestedBad.length > 0 && nestedBad.length !== topLevelBad.length) {
          console.log(`\n⚠️ Found ${nestedBad.length} tools with NESTED problematic schemas:`);
          nestedBad.forEach((t, i) => {
            if (!topLevelBad.includes(t)) {
              console.log(`   ${i + 1}. ${t.name}`);
            }
          });
        }

        if (topLevelBad.length === 0 && nestedBad.length === 0) {
          console.log(`✅ No problematic schemas found at top level`);
          console.log(`\n💡 The issue might be:`);
          console.log(`   1. Tool schemas are modified when Claude Code loads them`);
          console.log(`   2. The error is from a different tool numbering`);
          console.log(`   3. There's a version mismatch between @whop/mcp versions`);
        }

        // Save all tool schemas to a file for inspection
        const toolSchemas = tools.map((t, i) => ({
          index: i + 1,
          name: t.name,
          schema: t.input_schema
        }));
        writeFileSync('whop-tools-schemas.json', JSON.stringify(toolSchemas, null, 2));
        console.log(`\n💾 Saved all tool schemas to whop-tools-schemas.json for inspection`);

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
  console.log("⏰ Timeout");
  proc.kill();
}, 15000);
