# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Angular code | angular | C:\Users\34652\Documents\TFG\TFG_DND\.atl\skills\angular\SKILL.md |
| When writing FastAPI/Python code | fastapi | C:\Users\34652\Documents\TFG\TFG_DND\.atl\skills\fastapi\SKILL.md |
| When creating a pull request | branch-pr | C:\Users\34652\.config\opencode\skills\branch-pr\SKILL.md |
| When writing Go tests | go-testing | C:\Users\34652\.config\opencode\skills\go-testing\SKILL.md |
| When creating a GitHub issue | issue-creation | C:\Users\34652\.config\opencode\skills\issue-creation\SKILL.md |
| judgmental day, judgment-day | judgment-day | C:\Users\34652\.config\opencode\skills\judgment-day\SKILL.md |

## Compact Rules

### branch-pr
- Every PR MUST link an approved issue — no exceptions
- Every PR MUST have exactly one `type:*` label
- Automated checks must pass before merge
- Blank PRs without issue linkage will be blocked by GitHub Actions

### go-testing
- Use table-driven tests for multiple test cases
- Prefer golden file testing for complex outputs
- Use teatest for Bubbletea TUI testing
- Follow Go naming conventions: TestXxx

### issue-creation
- Blank issues are disabled — MUST use a template
- Every issue gets `status:needs-review` automatically
- A maintainer MUST add `status:approved` before any PR
- Questions go to Discussions, not issues

### judgment-day
- Launch two independent blind judge sub-agents simultaneously
- Synthesize findings, apply fixes, re-judge until both pass
- Escalate after 2 iterations if both judges fail

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | C:\Users\34652\Documents\TFG\TFG_DND\AGENTS.md | Project-level conventions |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.