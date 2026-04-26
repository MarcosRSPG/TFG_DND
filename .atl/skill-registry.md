# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Angular code | angular | .atl/skills/angular/SKILL.md |
| When writing FastAPI/Python code | fastapi | .atl/skills/fastapi/SKILL.md |
| When creating a pull request | branch-pr | ../../../.config/opencode/skills/branch-pr/SKILL.md |
| When writing Go tests | go-testing | ../../../.config/opencode/skills/go-testing/SKILL.md |
| When creating a GitHub issue | issue-creation | ../../../.config/opencode/skills/issue-creation/SKILL.md |
| judgmental day, judgment-day | judgment-day | ../../../.config/opencode/skills/judgment-day/SKILL.md |
| sdd init, initialize SDD | sdd-init | ../../../.config/opencode/skills/sdd-init/SKILL.md |
| sdd explore, investigate | sdd-explore | ../../../.config/opencode/skills/sdd-explore/SKILL.md |
| sdd propose, new change | sdd-propose | ../../../.config/opencode/skills/sdd-propose/SKILL.md |
| sdd spec, write specs | sdd-spec | ../../../.config/opencode/skills/sdd-spec/SKILL.md |
| sdd design, technical design | sdd-design | ../../../.config/opencode/skills/sdd-design/SKILL.md |
| sdd tasks, task breakdown | sdd-tasks | ../../../.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd apply, implement | sdd-apply | ../../../.config/opencode/skills/sdd-apply/SKILL.md |
| sdd verify, validate | sdd-verify | ../../../.config/opencode/skills/sdd-verify/SKILL.md |
| sdd archive, complete change | sdd-archive | ../../../.config/opencode/skills/sdd-archive/SKILL.md |

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
| AGENTS.md | AGENTS.md | Project-level conventions |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
