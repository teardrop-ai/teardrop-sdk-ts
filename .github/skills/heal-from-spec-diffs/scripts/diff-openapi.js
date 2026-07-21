#!/usr/bin/env node
/**
 * Structural diff of spec/openapi.json (and optionally events.schema.json)
 * against a git base ref (default: origin/main).
 *
 * Why this exists: spec/openapi.json is large (300+ KB, ~12k lines). Reading
 * it whole into an agent's context to eyeball a diff is slow and error-prone.
 * This script computes a small, deterministic, de-noised structural diff
 * instead:
 *
 *   - added/removed paths+operations (HTTP method + path)
 *   - added/removed component schemas
 *   - changed common schemas: added/removed properties, added/removed
 *     required fields (flags newly-required fields as breaking-for-responses)
 *   - with --events: added/removed SSE event names in events.schema.json
 *
 * Only Node builtins are used (fs, path, child_process) -- no npm install,
 * no devDependency, runs with the Node already required to work on this repo
 * (engines.node >= 18 per package.json).
 *
 * Usage:
 *   node .github/skills/heal-from-spec-diffs/scripts/diff-openapi.js [baseRef] [--events] [--max-lines N]
 *
 *   baseRef      git ref to diff against (default: origin/main)
 *   --events     also diff spec/events.schema.json event names
 *   --max-lines  cap output lines per section (default: 60)
 *
 * Limitations: schemas composed via allOf/$ref without inline "properties"
 * will show no property-level detail here -- fall back to a targeted
 * `git diff <baseRef> -- spec/openapi.json` scoped with grep around the
 * schema name for those.
 */

"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

function repoRoot() {
  const out = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
  });
  return out.trim();
}

function loadGitJson(ref, relPath, root) {
  let out;
  try {
    out = execFileSync("git", ["show", `${ref}:${relPath}`], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function loadLocalJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function operations(spec) {
  const ops = new Set();
  const paths = (spec && spec.paths) || {};
  for (const [p, item] of Object.entries(paths)) {
    for (const method of Object.keys(item || {})) {
      if (HTTP_METHODS.has(method)) {
        ops.add(`${method.toUpperCase()} ${p}`);
      }
    }
  }
  return ops;
}

function schemaShape(schema) {
  const props = new Set(Object.keys((schema && schema.properties) || {}));
  const required = new Set((schema && schema.required) || []);
  return { props, required };
}

function setDiff(a, b) {
  // items in a not in b
  return [...a].filter((x) => !b.has(x)).sort();
}

function diffOpenapi(oldSpec, newSpec, maxLines) {
  const lines = ["## Operations"];

  const oldOps = oldSpec ? operations(oldSpec) : new Set();
  const newOps = operations(newSpec);
  const addedOps = setDiff(newOps, oldOps);
  const removedOps = setDiff(oldOps, newOps);

  if (addedOps.length) {
    lines.push("Added:");
    lines.push(...addedOps.slice(0, maxLines).map((o) => `  + ${o}`));
  }
  if (removedOps.length) {
    lines.push("Removed:");
    lines.push(...removedOps.slice(0, maxLines).map((o) => `  - ${o}`));
  }
  if (!addedOps.length && !removedOps.length) {
    lines.push("(no path/method changes)");
  }

  const oldSchemas = ((oldSpec || {}).components || {}).schemas || {};
  const newSchemas = (newSpec.components || {}).schemas || {};
  const oldNames = new Set(Object.keys(oldSchemas));
  const newNames = new Set(Object.keys(newSchemas));

  const addedSchemas = setDiff(newNames, oldNames);
  const removedSchemas = setDiff(oldNames, newNames);
  const commonSchemas = [...oldNames].filter((n) => newNames.has(n)).sort();

  lines.push("");
  lines.push("## Component Schemas");
  if (addedSchemas.length) {
    lines.push("Added schemas: " + addedSchemas.slice(0, maxLines).join(", "));
  }
  if (removedSchemas.length) {
    lines.push("Removed schemas: " + removedSchemas.slice(0, maxLines).join(", "));
  }

  let changed = 0;
  for (const name of commonSchemas) {
    const oldShape = schemaShape(oldSchemas[name]);
    const newShape = schemaShape(newSchemas[name]);
    const propAdded = setDiff(newShape.props, oldShape.props);
    const propRemoved = setDiff(oldShape.props, newShape.props);
    const reqAdded = setDiff(newShape.required, oldShape.required);
    const reqRemoved = setDiff(oldShape.required, newShape.required);
    if (!propAdded.length && !propRemoved.length && !reqAdded.length && !reqRemoved.length) {
      continue;
    }
    changed += 1;
    if (changed > maxLines) {
      lines.push(`... (${changed - maxLines} more changed schemas truncated)`);
      break;
    }
    lines.push(`- ${name}:`);
    if (propAdded.length) lines.push(`    +props [${propAdded.join(", ")}]`);
    if (propRemoved.length) lines.push(`    -props [${propRemoved.join(", ")}]`);
    if (reqAdded.length) {
      lines.push(
        `    +required [${reqAdded.join(", ")}]  (BREAKING for existing callers if this is a response schema)`,
      );
    }
    if (reqRemoved.length) lines.push(`    -required [${reqRemoved.join(", ")}]`);
  }
  if (changed === 0) lines.push("(no changed common schemas)");

  return lines.join("\n");
}

function diffEvents(oldSpec, newSpec) {
  const oldEvents = new Set(Object.keys((oldSpec || {}).events || {}));
  const newEvents = new Set(Object.keys(newSpec.events || {}));
  const added = setDiff(newEvents, oldEvents);
  const removed = setDiff(oldEvents, newEvents);

  const lines = ["## Events"];
  if (added.length) lines.push("Added: " + added.join(", "));
  if (removed.length) lines.push("Removed: " + removed.join(", "));
  if (!added.length && !removed.length) lines.push("(no event name changes)");
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = { baseRef: "origin/main", events: false, maxLines: 60 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--events") {
      args.events = true;
    } else if (a === "--max-lines") {
      args.maxLines = parseInt(argv[++i], 10) || 60;
    } else {
      rest.push(a);
    }
  }
  if (rest.length) args.baseRef = rest[0];
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();

  const newSpec = loadLocalJson(path.join(root, "spec", "openapi.json"));
  if (newSpec === null) {
    console.error("spec/openapi.json not found in working tree");
    return 1;
  }

  const oldSpec = loadGitJson(args.baseRef, "spec/openapi.json", root);
  if (oldSpec === null) {
    console.error(
      `(warning) could not read spec/openapi.json at '${args.baseRef}'; treating everything as added`,
    );
  }

  const oldVersion = ((oldSpec || {}).info || {}).version || "?";
  const newVersion = (newSpec.info || {}).version || "?";
  console.log(`# openapi.json: ${oldVersion} -> ${newVersion} (base: ${args.baseRef})\n`);
  console.log(diffOpenapi(oldSpec, newSpec, args.maxLines));

  if (args.events) {
    const oldEventsSpec = loadGitJson(args.baseRef, "spec/events.schema.json", root);
    const newEventsSpec = loadLocalJson(path.join(root, "spec", "events.schema.json"));
    if (newEventsSpec !== null) {
      console.log();
      const oldEvVersion = (oldEventsSpec || {}).version || "?";
      const newEvVersion = newEventsSpec.version || "?";
      console.log(`# events.schema.json: ${oldEvVersion} -> ${newEvVersion}\n`);
      console.log(diffEvents(oldEventsSpec, newEventsSpec));
    }
  }

  return 0;
}

process.exitCode = main();
