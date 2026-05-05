# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\34652\.config\opencode\skills\go-testing\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\34652\.config\opencode\skills\skill-creator\SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:\Users\34652\.config\opencode\skills\branch-pr\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:\Users\34652\.config\opencode\skills\issue-creation\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### go-testing
- Use table-driven tests for multiple test cases (struct with name, input, expected, wantErr)
- Test Bubbletea TUI state transitions directly via Model.Update()
- Use teatest.NewTestModel() for interactive TUI flows
- Golden file testing: compare output against testdata/*.golden files
- Mock system info for deterministic tests (set SystemInfo field)
- Commands: `go test ./...`, `go test -v`, `go test -cover`, `go test -update` (update goldens)

### skill-creator
- Create skill when pattern is reused, conventions differ from generic, or complex workflows need steps
- SKILL.md structure: frontmatter (name, description with trigger, license, metadata), When to Use, Critical Patterns, Code Examples, Commands
- Use assets/ for templates/schemas, references/ for local doc links (NO web URLs)
- Naming: `{technology}` (generic), `{project}-{component}` (project-specific), `{action}-{target}` (workflow)
- Register new skill in AGENTS.md after creation

### branch-pr
- EVERY PR must link approved issue (Closes #N, Fixes #N, Resolves #N)
- Branch naming: `type/description` (type: feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert)
- PR must have exactly one `type:*` label matching conventional commit type
- PR body: Linked Issue + PR Type (one checkbox) + Summary (1-3 bullets) + Changes Table + Test Plan + Checklist
- Conventional commits regex: `^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9\._-]+\))?!?: .+`
- Commands: `shellcheck scripts/*.sh` before push, `gh pr create`, `gh pr edit --add-label`

### issue-creation
- Blank issues disabled — must use Bug Report or Feature Request template
- Every issue gets `status:needs-review` automatically — maintainer must add `status:approved`
- Bug Report required: Pre-flight checks, Description, Steps to Reproduce, Expected/Actual Behavior, OS, Agent, Shell
- Feature Request required: Pre-flight checks, Problem Description, Proposed Solution, Affected Area
- Questions go to Discussions, NOT issues
- Labels: Bug Report → `bug` + `status:needs-review`; Feature → `enhancement` + `status:needs-review`

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | C:\Users\34652\Documents\TFG\TFG_DND\AGENTS.md | Main project instructions, persona, engram protocol, tech stack |
| angular skill | C:\Users\34652\Documents\TFG\TFG_DND\.atl\skills\angular\SKILL.md | Angular patterns: signals, HttpClient, lazy loading, naming conventions |
| fastapi skill | C:\Users\34652\Documents\TFG\TFG_DND\.atl\skills\fastapi\SKILL.md | FastAPI patterns: async everything, Motor for MongoDB, Pydantic models |
