# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Angular code, components, services, or pages | angular | .atl/skills/angular/SKILL.md |
| When writing Python/FastAPI code, routes, services, or models | fastapi | .atl/skills/fastapi/SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | ../../../.config/opencode/skills/branch-pr/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | ../../../.config/opencode/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | ../../../.config/opencode/skills/issue-creation/SKILL.md |
| judgment day, judgment-day, review adversarial, dual review, doble review, juzgar, que lo juzguen | judgment-day | ../../../.config/opencode/skills/judgment-day/SKILL.md |
| sdd init, iniciar sdd, openspec init | sdd-init | ../../../.config/opencode/skills/sdd-init/SKILL.md |
| sdd explore, investigate ideas before committing to a change | sdd-explore | ../../../.config/opencode/skills/sdd-explore/SKILL.md |
| sdd propose, create a change proposal with intent, scope, and approach | sdd-propose | ../../../.config/opencode/skills/sdd-propose/SKILL.md |
| sdd spec, write specifications with requirements and scenarios | sdd-spec | ../../../.config/opencode/skills/sdd-spec/SKILL.md |
| sdd design, create technical design document with architecture decisions | sdd-design | ../../../.config/opencode/skills/sdd-design/SKILL.md |
| sdd tasks, break down a change into implementation task checklist | sdd-tasks | ../../../.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd apply, implement tasks from the change, writing actual code | sdd-apply | ../../../.config/opencode/skills/sdd-apply/SKILL.md |
| sdd verify, validate that implementation matches specs, design, and tasks | sdd-verify | ../../../.config/opencode/skills/sdd-verify/SKILL.md |
| sdd archive, sync delta specs to main specs and archive a completed change | sdd-archive | ../../../.config/opencode/skills/sdd-archive/SKILL.md |
| Creates new AI agent skills following the Agent Skills spec | skill-creator | ../../../.config/opencode/skills/skill-creator/SKILL.md |

## Compact Rules

### angular
- Use signals for ALL component state: `items = signal<T[]>([])`
- Use HttpClient for API calls with `firstValueFrom()` + `async/await`
- Standalone components ONLY: `standalone: true` in `@Component` decorator
- Lazy loading for routes: `loadComponent: () => import(...).then(m => m.Component)`
- **ALWAYS notify before applying lazy loading** — user wants to be informed
- **ALWAYS specify file path when making changes** — no silent changes
- Naming: `nombre.ts` (components), `nombreService.ts` (services), `PascalCase.ts` (interfaces)
- No verbose comments — code should be self-explanatory
- Run commands from `APP/` subdirectory: `cd APP && npm start`

### fastapi
- All database I/O MUST be async — use Motor (`AsyncIOMotorClient`)
- Pydantic models for validation: inherit from `BaseModel`, use `model_validate()`
- Repository → Service → Route layer separation
- **ALWAYS ask before applying changes** — no silent modifications
- Naming: `snake_case` (functions), `PascalCase.py` (models), `snake_case.py` (routes/services)
- No verbose comments — code should be self-explanatory
- Use `model_config = ConfigDict(extra="allow")` for flexible Pydantic models

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
| INFORME_FLUJOS_Y_REQUISITOS.md | INFORME_FLUJOS_Y_REQUISITOS.md | Functional requirements (1586 lines) |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
