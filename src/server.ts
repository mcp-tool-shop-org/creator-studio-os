#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFcpTools } from "./apps/fcp/tools.js";

async function main() {
  const server = new McpServer({
    name: "creator-studio-os",
    version: "1.0.0",
  });

  registerFcpTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("creator-studio-os fatal:", e);
  process.exit(1);
});
