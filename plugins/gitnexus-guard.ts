import type { Plugin } from "@opencode/plugin"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

// Blocks source edits in a primary session until the gitnexus graph has been
// queried once. Fail-open: subagent sessions, unindexed repos and small repos
// are never blocked — below the node floor a text search is cheaper than a graph.
const CODE = /\.(py|pyi|ts|tsx|js|jsx|mjs|go|rs|java|kt|rb|php)$/
const GRAPH = /^gitnexus[_-]/
const EDIT = new Set(["edit", "write", "patch", "multiedit"])
const MIN_NODES = 1000

const sizes = new Map<string, number>()
function nodeCount(repo: string): number {
  const known = sizes.get(repo)
  if (known !== undefined) return known
  let nodes = 0
  try {
    nodes = JSON.parse(readFileSync(join(repo, ".gitnexus", "meta.json"), "utf8"))?.stats?.nodes ?? 0
  } catch {
    // unreadable meta.json -> treat as small; the guard never blocks on a guess
  }
  sizes.set(repo, nodes)
  return nodes
}

function indexedRepo(file: string): string | null {
  let dir = dirname(file)
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, ".gitnexus", "meta.json"))) return nodeCount(dir) >= MIN_NODES ? dir : null
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export const GitnexusGuard: Plugin = async () => {
  const enforced = new Map<string, boolean>()
  const queried = new Set<string>()

  return {
    "chat.message": async (input) => {
      // Only a known primary agent is enforced; anything else is left alone.
      if (input.agent) enforced.set(input.sessionID, !/^(gsd-|explore$|general$)/.test(input.agent))
    },

    "tool.execute.after": async (input) => {
      if (GRAPH.test(input.tool)) queried.add(input.sessionID)
    },

    "tool.execute.before": async (input, output) => {
      if (!EDIT.has(input.tool)) return
      if (enforced.get(input.sessionID) !== true) return
      if (queried.has(input.sessionID)) return

      const file = output.args?.filePath ?? output.args?.path
      if (typeof file !== "string" || !CODE.test(file) || !existsSync(file)) return
      if (!indexedRepo(file)) return

      throw new Error(
        `gitnexus guard: ${file} is in an indexed repo and no graph query has run this session.\n` +
          `Call gitnexus_impact (direction "upstream") on the symbol you are about to change, ` +
          `or gitnexus_context for its callers, then retry the edit.`,
      )
    },
  }
}
