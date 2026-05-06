#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InMemoryTaskStore } from "@modelcontextprotocol/sdk/experimental/tasks/stores/in-memory.js";
import { registerFcpTools } from "@creator-studio-os/fcp";
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { registerPixelmatorTools } from "@creator-studio-os/pixelmator";
import { registerLogicTools } from "@creator-studio-os/logic";
import { registerMotionTools } from "@creator-studio-os/motion";
import { registerKeynoteTools } from "@creator-studio-os/keynote";
import { registerPagesTools } from "@creator-studio-os/iwork-docs";
import { registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { registerStatusTool } from "@creator-studio-os/core";
import { registerProtocolTools } from "@creator-studio-os/protocols";

async function main() {
  const taskStore = new InMemoryTaskStore();

  const server = new McpServer(
    {
      name: "creator-studio-os",
      version: "1.7.0",
    },
    { taskStore },
  );

  registerFcpTools(server);
  registerCompressorTools(server);
  registerPixelmatorTools(server);
  registerLogicTools(server);
  registerMotionTools(server);
  registerKeynoteTools(server);
  registerPagesTools(server);
  registerNumbersTools(server);
  registerStatusTool(server);
  registerProtocolTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("creator-studio-os fatal:", e);
  process.exit(1);
});
