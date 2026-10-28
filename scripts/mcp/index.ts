// MCP server (stdio) for adding events, news and magazine articles to the database.
// Usage: npm run mcp — registered for Claude Code in .mcp.json. Writes to DATABASE_URL.
// Inserts never overwrite: an existing slug (events, magazine) or URL (news) is reported and left as is.
// Tools live in tools/, one file per feature; add new ones to the list below.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { serverInfo } from "./config.ts";
import { registerTools } from "./tool.ts";
import { clubTools } from "./tools/clubs.ts";
import { eventTools } from "./tools/events.ts";
import { imageTools } from "./tools/images.ts";
import { magazineTools } from "./tools/magazine.ts";
import { newsTools } from "./tools/news.ts";

const server = new McpServer(serverInfo);
registerTools(server, [...clubTools, ...eventTools, ...newsTools, ...magazineTools, ...imageTools]);
await server.connect(new StdioServerTransport());
