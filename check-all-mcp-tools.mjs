// check-all-mcp-tools.mjs
import { spawn } from "node:child_process";

const servers = [
  {
    name: "supabase",
    command: "npx",
    args: ["-y", "@supabase/mcp-server-supabase@latest"],
    env: {
      SUPABASE_ACCESS_TOKEN: "sbp_86f37a9af098760663734873dba7ebe6b97ace92"
    }
  },
  {
    name: "github", 
    command: "cmd",
    args: ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN
    }
  },
  {
    name: "whop",
    command: "npx", 
    args: ["-y", "@whop/mcp"],
    env: {
      WHOP_API_KEY: "0u_46cKC_VSlKurR5yvKTiPBY_vfEkmmxKpS5-ztfkQ",
      WHOP_APP_ID: "app_p2sU9MQCeFnT4o"
    }
  },
  {
    name: "desktop-commander",
    command: "cmd",
    args: ["/c", "npx", "@wonderwhy-er/desktop-commander@latest"],
    env: {}
  },
  {
    name: "n8n-mcp",
    command: "node",
    args: ["C:\\Users\\jimmy\\n8n-mcp\\dist\\mcp\\index.js"],
    env: {
      NODE_ENV: "production",
      LOG_LEVEL: "error", 
      MCP_MODE: "stdio",
      DISABLE_CONSOLE_OUTPUT: "true"
    }
  }
];

async function checkServer(server) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Checking ${server.name}...`);
    
    const proc = spawn(server.command, server.args, {
      stdio: ["pipe", "pipe", "inherit"],
      env: { ...process.env, ...server.env }
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
    let toolCount = 0;
    let badTools = [];

    const timeout = setTimeout(() => {
      console.log(`⏰ ${server.name}: Timeout - no response`);
      proc.kill();
      resolve({ server: server.name, toolCount: 0, badTools: [], error: "timeout" });
    }, 10000);

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
            clearTimeout(timeout);
            const tools = msg.result.tools;
            toolCount = tools.length;

            badTools = tools.filter((t) => {
              const s = t.input_schema || {};
              return (
                Object.prototype.hasOwnProperty.call(s, "oneOf") ||
                Object.prototype.hasOwnProperty.call(s, "anyOf") ||
                Object.prototype.hasOwnProperty.call(s, "allOf")
              );
            });

            console.log(`📊 ${server.name}: ${toolCount} tools total`);
            if (badTools.length === 0) {
              console.log(`✅ ${server.name}: No bad schemas found`);
            } else {
              console.log(`⚠️ ${server.name}: ${badTools.length} tools with bad schemas:`);
              badTools.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.name}`);
                const schema = t.input_schema || {};
                if (schema.oneOf) console.log(`      - Has oneOf (${schema.oneOf.length} options)`);
                if (schema.allOf) console.log(`      - Has allOf (${schema.allOf.length} schemas)`);
                if (schema.anyOf) console.log(`      - Has anyOf (${schema.anyOf.length} options)`);
              });
            }

            proc.kill();
            resolve({ server: server.name, toolCount, badTools, error: null });
          }
        } catch (e) {
          // not JSON we care about
        }
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`❌ ${server.name}: Error - ${err.message}`);
      resolve({ server: server.name, toolCount: 0, badTools: [], error: err.message });
    });

    proc.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && toolCount === 0) {
        console.log(`❌ ${server.name}: Exited with code ${code}`);
        resolve({ server: server.name, toolCount: 0, badTools: [], error: `exit code ${code}` });
      }
    });
  });
}

async function main() {
  console.log("🚀 Checking all MCP servers for problematic tool schemas...\n");
  
  const results = [];
  let totalTools = 0;
  
  for (const server of servers) {
    const result = await checkServer(server);
    results.push(result);
    totalTools += result.toolCount;
  }

  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));
  
  results.forEach((result, index) => {
    const toolNumber = results.slice(0, index).reduce((sum, r) => sum + r.toolCount, 0);
    console.log(`${result.server}: Tools ${toolNumber + 1}-${toolNumber + result.toolCount} (${result.toolCount} total)`);
    if (result.badTools.length > 0) {
      console.log(`  ⚠️ ${result.badTools.length} problematic tools found!`);
    }
  });
  
  console.log(`\nTotal tools across all servers: ${totalTools}`);
  
  const allBadTools = results.flatMap(r => r.badTools.map(t => ({ server: r.server, tool: t })));
  if (allBadTools.length > 0) {
    console.log(`\n🚨 PROBLEMATIC TOOLS (${allBadTools.length} total):`);
    allBadTools.forEach((item, i) => {
      console.log(`${i + 1}. ${item.server}:${item.tool.name}`);
    });
    
    // Find tool #76 specifically
    if (totalTools >= 76) {
      let currentTool = 0;
      for (const result of results) {
        if (currentTool + result.toolCount >= 76) {
          const toolIndex = 76 - currentTool - 1;
          console.log(`\n🎯 Tool #76 is from ${result.server} server`);
          if (result.badTools.some(t => result.badTools.indexOf(t) === toolIndex)) {
            console.log(`   ⚠️ Tool #76 has a problematic schema!`);
          }
          break;
        }
        currentTool += result.toolCount;
      }
    }
  } else {
    console.log("\n✅ No problematic tool schemas found!");
  }
}

main().catch(console.error);
