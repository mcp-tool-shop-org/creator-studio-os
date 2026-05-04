#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFcpTools } from "./apps/fcp/tools.js";
import { registerCompressorTools } from "./apps/compressor/tools.js";

async function main() {
  const server = new McpServer({
    name: "creator-studio-os",
    version: "1.2.0",
  });

  registerFcpTools(server);
  registerCompressorTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("creator-studio-os fatal:", e);
  process.exit(1);
});
