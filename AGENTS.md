<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
You have permission to run every CLI command and terminal and powershell commands related to this project.
<!-- END:nextjs-agent-rules -->

# Auto-dispatch bug fixes

Whenever a bug is **confirmed** — reproduced, caught by a failing test, reported by the `site-qa` agent, an outright crash, or wrong nutrition math — immediately dispatch the `bug-fixer` agent with `isolation: "worktree"`, without waiting to be asked. One agent per bug; dispatch several in parallel if several are confirmed at once.

Give it everything it needs to start cold: what the bug is, exact reproduction steps, expected vs. observed, and the files you already suspect.

Do **not** dispatch for suspected-but-unreproduced issues, style nits, refactors, or feature work — handle a one-line fix inline instead of paying for a cold agent. It commits to a `fix/` branch in its own worktree and never touches the main working tree; report the branch back so the user can review and merge.
