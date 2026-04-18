/**
 * Split an MCP-namespaced tool name into server and tool components.
 *
 * MCP server tools use a double-underscore separator:
 *   `"{server_name}__{mcp_tool_name}"`
 *
 * @example
 * parseMcpToolName("stripe__create_refund")
 * // → { isMcp: true, serverName: "stripe", toolName: "create_refund" }
 *
 * parseMcpToolName("web_search")
 * // → { isMcp: false }
 */
export function parseMcpToolName(
  name: string,
):
  | { isMcp: true; serverName: string; toolName: string }
  | { isMcp: false } {
  const idx = name.indexOf("__");
  if (idx <= 0) return { isMcp: false };
  return {
    isMcp: true,
    serverName: name.slice(0, idx),
    toolName: name.slice(idx + 2),
  };
}
