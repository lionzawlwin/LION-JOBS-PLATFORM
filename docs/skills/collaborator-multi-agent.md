# Collaborator — evaluated, not adopted (yet)

**Repo:** https://github.com/collaborator-ai/collab-public
**Evaluated:** 2026-07-02
**Status:** Documented for future reference. Not installed. Not a Claude Code skill.

## What it actually is

Collaborator is a native Electron desktop app (macOS/Windows/Linux) — an infinite pan-and-zoom canvas where you arrange terminal sessions, code files, notes, and images as tiles. You double-click empty canvas to open a terminal tile, then manually start an agent inside it (e.g. run `claude` in that terminal). Files dragged from its sidebar onto the canvas become live tiles bound to the file on disk.

**It has no CLI, no API, no MCP server, and no scriptable interface.** It is not something Claude Code can invoke, configure, or drive programmatically — it's a human-operated GUI, comparable to a specialized window manager for terminals. Nothing in this document describes a "skill" in the sense of a capability Claude Code gains; it's a note for the human operator (you) on how to set up and use the tool yourself, should you want a visual multi-terminal workspace for running several agent sessions side by side.

## Why it wasn't installed now

- It's a system-level desktop app install, unrelated to this project's codebase, `package.json`, or deployment pipeline
- Explicitly "early-stage and in active development" per its own README (2026-07-02 snapshot)
- Nothing in this project's current or near-term backlog is bottlenecked on terminal/window management — the actual work (implementing features, reviewing code) doesn't change based on which terminal UI it's typed into
- There's no automatic benefit to code quality, task completion, or this repo from installing it — the benefit, if any, is purely human ergonomics (spatial arrangement of parallel terminal sessions)

## Stack (for reference)

Electron 40, React 19, Tailwind CSS 4, electron-vite, xterm.js (terminal emulation via a persistent node-pty sidecar), Monaco Editor, BlockNote/TipTap (markdown), D3 (graph viz), sharp, KaTeX. All application state is stored locally in `~/.collaborator/` as JSON — no accounts, no cloud sync. Anonymous usage analytics via PostHog.

## Install (for the human operator, when/if desired)

**Prebuilt release (simplest):**
- Windows: download the `.exe` installer from https://github.com/collaborator-ai/collab-public/releases/latest
- macOS/Linux: same releases page, or:
  ```sh
  curl -fsSL https://raw.githubusercontent.com/collaborator-ai/collab-public/main/install.sh | bash
  ```

**Build from source** (requires Node.js 22+ and Bun):
```sh
git clone https://github.com/collaborator-ai/collab-public.git
cd collab-public/collab-electron
bun install
bun run dev     # hot-reload dev mode
# or
bun run build   # production build
```

## Usage (for the human operator)

1. Open Collaborator
2. Add a workspace: workspace dropdown → "Add workspace" (or Cmd/Ctrl+Shift+O) → select a local folder — e.g. this project's root, or the worktree directory for a specific feature branch
3. Double-click empty canvas → creates a terminal tile, working directory set to the workspace path → start an agent in it manually (e.g. `claude`)
4. Drag files from the navigator sidebar onto the canvas to open them as live tiles alongside the running terminal(s) — useful for keeping a plan doc or spec file visible next to the agent working on it
5. Repeat step 3 in a second/third terminal tile to run multiple agent sessions in parallel, visually arranged — this is the closest thing to "multiple agents" the tool offers, and it's entirely manual (you start each one yourself)

Each workspace has its own independent file tree; canvas and viewer are shared. Canvas layout (tile positions, sizes, viewport) persists automatically to `~/.collaborator/canvas-state.json`.

## When to revisit

If a future version adds a CLI, API, or MCP integration that lets an agent (rather than a human) create/arrange tiles or spawn terminal sessions programmatically, that would change the calculus — at that point it would become a genuine "skill acquisition" candidate. As of this evaluation, it doesn't have one, so there is nothing for Claude Code to "learn to command."
