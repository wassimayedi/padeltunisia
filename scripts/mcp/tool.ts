// Tool definition helpers and input fields shared by several tools.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { eventScope } from "../../src/db/schema.ts";

export type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

export const reply = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
export const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: never) => Promise<ToolResult>;
};

/** Types the handler's arguments from its input schema. */
export function defineTool<S extends z.ZodRawShape>(tool: {
  name: string;
  description: string;
  inputSchema: S;
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>;
}): ToolDefinition {
  return tool;
}

export function registerTools(server: McpServer, tools: ToolDefinition[]) {
  // The SDK's own registerTool typing makes tsc recurse endlessly on these zod shapes
  // (TS2589); defineTool already types each handler, so it is called untyped here.
  const register = server.registerTool.bind(server) as unknown as (
    name: string,
    config: { description: string; inputSchema: z.ZodRawShape },
    handler: (args: never) => Promise<ToolResult>,
  ) => void;
  for (const { name, description, inputSchema, handler } of tools) {
    // Handler errors (unknown slug, DB failure) become tool errors instead of crashing the server.
    register(name, { description, inputSchema }, async (args: never) => {
      try {
        return await handler(args);
      } catch (error) {
        // Drizzle wraps driver errors ("Failed query: …"); the cause says what actually went wrong.
        const cause =
          error instanceof Error && error.cause instanceof Error
            ? `\n${error.cause.message || ("code" in error.cause ? String(error.cause.code) : error.cause.name)}`
            : "";
        return fail((error instanceof Error ? error.message : String(error)) + cause);
      }
    });
  }
}

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase letters, digits and hyphens")
  .describe("URL slug, e.g. 33eme-etape-ftt-padel-house-2026");
export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
export const scope = z.enum(eventScope.enumValues).describe("tn = Tunisia, int = international");
