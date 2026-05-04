# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:\Users\informatica\.config\opencode\skills\issue-creation\SKILL.md |
| creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:\Users\informatica\.config\opencode\skills\branch-pr\SKILL.md |
| writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\informatica\.config\opencode\skills\go-testing\SKILL.md |
| user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:\Users\informatica\.config\opencode\skills\judgment-day\SKILL.md |
| user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\informatica\.config\opencode\skills\skill-creator\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### issue-creation
- Blank issues are disabled — MUST use a template (bug report or feature request)
- Every issue gets `status:needs-review` automatically on creation
- A maintainer MUST add `status:approved` before any PR can be opened
- Questions go to Discussions, not issues
- Search existing issues for duplicates before creating new one
- Fill ALL required fields in the template

### branch-pr
- Every PR MUST link an approved issue — no exceptions
- Every PR MUST have exactly one `type:*` label
- Automated checks must pass before merge is possible
- Branch naming: `type/description` (feat/fix/chore/docs/style/refactor/perf/test/build/ci/revert)
- Branch description: lowercase, no spaces, only `a-z0-9._-`
- PR body MUST contain: linked issue (Closes #N), PR type checkbox, summary, changes table

### go-testing
- Use table-driven tests for multiple test cases (standard Go pattern)
- Bubbletea TUI: test Model state transitions directly with `m.Update()`
- Teatest: use `teatest.NewTestModel()` for interactive TUI flows
- Golden file testing: compare output against `testdata/*.golden` files
- Run tests: `go test ./...` or `go test -run TestName ./path`
- Coverage: `go test -cover ./...`

### judgment-day
- Launch TWO sub-agents via `delegate` in parallel (never sequential)
- Each agent receives the same target but works independently (blind review)
- Neither agent knows about the other — no cross-contamination
- Classify warnings: (real) causes bug in production → fix required; (theoretical) contrived scenario → report only
- Convergence: confirmed CRITICALs + real WARNINGs → fix + re-judge; theoretical → report as INFO
- After 2 fix iterations, if issues remain → escalate to user

### skill-creator
- Create skill when pattern is used repeatedly or project conventions differ from generic practices
- Don't create for trivial patterns or one-off tasks
- Structure: `skills/{skill-name}/` with `SKILL.md` (required), `assets/` (optional), `references/` (optional)
- SKILL.md template: frontmatter (name, description with trigger, license, metadata), When to Use, Critical Patterns, Code Examples, Commands, Resources
- Naming: generic `{technology}`, project-specific `{project}-{component}`, testing `{project}-test-{component}`

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | C:\Users\informatica\Documents\TFG\TFG_DND\AGENTS.md | Project instructions: TFG_DND structure, Angular 21 + FastAPI, testing with Vitest, Prettier config, gotchas |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
