#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFcpTools } from "./apps/fcp/tools.js";
import { registerCompressorTools } from "./apps/compressor/tools.js";
import { registerPixelmatorTools } from "./apps/pixelmator/tools.js";
import { registerLogicTools } from "./apps/logic/tools.js";
import { registerMotionTools } from "./apps/motion/tools.js";
import { registerKeynoteTools } from "./apps/keynote/tools.js";
import { registerPagesTools } from "./apps/pages/tools.js";
import { registerNumbersTools } from "./apps/numbers/tools.js";

async function main() {
  const server = new McpServer({
    name: "creator-studio-os",
    version: "1.5.0",
  });

  registerFcpTools(server);
  registerCompressorTools(server);
  registerPixelmatorTools(server);
  registerLogicTools(server);
  registerMotionTools(server);
  registerKeynoteTools(server);
  registerPagesTools(server);
  registerNumbersTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("creator-studio-os fatal:", e);
  process.exit(1);
});
