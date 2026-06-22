# OpenSpec + Claude Code Workflow

## 1. Install & Init

```bash
npm install -g @fission-ai/openspec@latest
cd popup-extension
openspec init --tools claude
```

Generates `.claude/skills/` and `.claude/commands/opsx/` — Claude Code picks them up automatically.

---

## 2. Plan — `/opsx:propose`

```
/opsx:propose popup-extension
```

Claude generates an artifact bundle in `openspec/changes/popup-extension/`:

| File | Purpose |
|---|---|
| `proposal.md` | Intent, scope, approach, rollback plan |
| `specs/` | Delta requirements (ADDED / MODIFIED / REMOVED) |
| `design.md` | Architecture decisions, sequence diagrams |
| `tasks.md` | Implementation checklist — drives the apply step |

Review and iterate with Claude until the artifacts look right before moving on.

---

## 3. Implement — `/opsx:apply`

```
/opsx:apply popup-extension
```

Claude reads `tasks.md` and implements each task one by one, checking them off as it goes. If interrupted, it resumes from where it left off.

---

## 4. Verify — `/opsx:verify`

```
/opsx:verify popup-extension
```

Claude checks the implementation against the artifacts across three dimensions:
- **Completeness** — all tasks done?
- **Correctness** — implementation matches the spec?
- **Coherence** — no contradictions between artifacts and code?

Reports issues as CRITICAL / WARNING / SUGGESTION.

---

## 5. Archive — `/opsx:archive`

```
/opsx:archive popup-extension
```

Moves the change folder to `openspec/changes/archive/YYYY-MM-DD-popup-extension/` for audit trail.

---

## Notes

- Use a high-reasoning model (Opus) for planning steps (`/opsx:propose`)
- Use Sonnet for implementation (`/opsx:apply`)
- Run `openspec update` if slash commands stop being recognized after a package update
