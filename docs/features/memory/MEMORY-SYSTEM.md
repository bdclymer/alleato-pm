# The Alleato Memory System — What It Is and Why It Exists

*For Megan Harrison — the human explanation behind the technical setup*

---

## The problem we kept hitting

You'd be deep in a Claude Code session working on something like the financial markup dropdown
in prime contracts. You'd figure out where the data lives, which component is broken, and what
the root cause is. Then the session ends, or you start a new chat.

Next session: Claude starts from scratch. "Let me explore the database to understand the schema."
"Let me read through the components directory." Everything you already figured out, re-discovered.

This isn't just annoying — it's a real drag on momentum. The best ideas and the most productive
sessions happen when you can just *continue*, not restart.

The memory system solves this.

---

## What we built and where it lives

### 1. WORKING_CONTEXT.md (in the Alleato project root)

This is the day-to-day solution. A living document that Claude reads at the start of every
session and updates at the end of every session.

It captures:
- What's currently being worked on
- What we've already found (exact file paths, column names, root causes)
- What's been tried and didn't work (so we don't loop)
- What's next

Think of it as the project's short-term memory. You can read it yourself to quickly remember
where you left off, or to see what Claude discovered.

### 2. The CLAUDE.md addition

The existing CLAUDE.md already had strong rules for Claude Code. We added a section that:
- Makes reading WORKING_CONTEXT.md mandatory at session start
- Makes updating it mandatory at session end
- Explains *why* the system exists (so Claude understands the intent, not just the rule)
- Explains how memory actually works (context windows, RAG) for your reference

---

## How memory actually works — the plain English version

### Why Claude "forgets" between sessions

Claude Code uses a context window — think of it as working memory. Everything it reads and
does in a session lives in that window. When the session ends, the window clears. There's no
persistence. This is how all LLMs work right now.

The fix isn't to make Claude remember more — it's to externalize the memory into files that
Claude can read at the start of the next session. WORKING_CONTEXT.md is that file.

### Why Claude sometimes "forgets" mid-session

Even within a long session, if Claude reads many large files, the earlier parts of the
conversation receive less attention as the context fills up. This is the "pushed out" problem.

WORKING_CONTEXT.md counteracts this by keeping the most critical facts in a short, highly
readable file that stays prominent throughout the session.

### What RAG is (and why you shouldn't worry about it for now)

RAG stands for Retrieval-Augmented Generation. It's the approach that lets AI systems "know"
things without holding all knowledge in memory at once.

The concept: instead of stuffing everything into context (impossible — it overflows), you store
knowledge as searchable embeddings in a database. When the AI needs to know something, it
searches for the most relevant pieces and pulls only those into context.

You already built this for Alleato meeting notes (the Fireflies pipeline). Same idea.

**For now:** WORKING_CONTEXT.md is your RAG system. It's manual, simple, and effective.

**Later:** We can build a proper memory database — logging code changes, debugging sessions,
architectural decisions — so Claude can semantically search the project's entire history and
find "what do I know about the markup dropdown?" in milliseconds.

---

## What you need to do differently

Almost nothing. The system runs automatically once Claude knows about it.

The one thing that helps: if you start a new session on a specific task, paste something like:

> "Read WORKING_CONTEXT.md first, then let's continue working on [task]."

That's it. Claude handles the rest.

---

## Why this matters beyond just saving time

There's a bigger pattern here. You mentioned that you implement good processes but then forget
the "why" behind them, so they atrophy. This document is an attempt to break that cycle by
capturing the reasoning alongside the implementation.

The why behind the memory system is this: momentum compounds. Every session that starts where
the last one left off is more productive than one that restarts from scratch. Over months, that
difference is enormous — not just in time saved, but in the quality of what gets built.

The same logic applies to all the other processes: your CLAUDE.md gates, your incident log,
your PRP workflow. They exist because someone (you, or Claude) hit a wall, figured out the
right way, and wrote it down so it wouldn't have to be figured out again.

The documentation IS the process. This file is part of that.

---

## Files created / modified

| File | What | Location |
|------|------|----------|
| `WORKING_CONTEXT.md` | Living session scratchpad | Project root |
| `CLAUDE.md` (appended) | Anti-amnesia protocol + memory explanation | Project root |
| This file | Human documentation of the system | `docs/` (recommended) |

---

*Created: 2026*
*Owner: Megan Harrison LLC*
