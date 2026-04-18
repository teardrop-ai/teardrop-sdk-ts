/**
 * Parse a qualified marketplace tool name into its components.
 *
 * Marketplace tools use `org_slug/tool_name` format.
 *
 * @example
 * parseMarketplaceToolName("acme/web_search")
 * // → { orgSlug: "acme", toolName: "web_search" }
 *
 * @throws {Error} If the name does not contain a `/` separator.
 */
export function parseMarketplaceToolName(
  qualifiedName: string,
): { orgSlug: string; toolName: string } {
  const idx = qualifiedName.indexOf("/");
  if (idx <= 0) {
    throw new Error(
      `Invalid qualified tool name "${qualifiedName}": expected "org_slug/tool_name" format`,
    );
  }
  return {
    orgSlug: qualifiedName.slice(0, idx),
    toolName: qualifiedName.slice(idx + 1),
  };
}
