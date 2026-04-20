# TFG_DND — Agent Instructions

## Project Structure

This is a monorepo. The actual application is in `APP/`, not the root directory.

- **Root**: `package.json` with only shared deps (`crypto-js`)
- **APP/**: Angular 21 application (D&D campaign & character manager)

## Developer Commands

All npm commands run from `APP/`:

```bash
cd APP
npm start        # ng serve (dev server)
npm run build   # ng build
npm test        # ng test (Vitest)
npm run watch   # ng build --watch --configuration development
```

## Tech Stack

- **Framework**: Angular 21 (cutting edge)
- **Language**: TypeScript 5.9 (strict mode enabled)
- **Test Runner**: Vitest (`@angular/build:unit-test`)
- **Formatter**: Prettier (configured in APP/package.json)

## Prettier Config

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

## TypeScript Strict Mode

`tsconfig.json` has full strict mode:
- `strict: true`
- `noImplicitReturns: true`
- `strictTemplates: true`

## Important Files

- `INFORME_FLUJOS_Y_REQUISITOS.md`: Detailed functional requirements (1000+ lines)
- `APP/src/app/app.routes.ts`: Route definitions
- `APP/src/environments/`: Environment config (dev vs prod)

## Testing

- Tests use Vitest (not Jest)
- Test files: `*.spec.ts` alongside components
- Run single test: `ng test --include="**/specific.spec.ts"`

## Gotchas

1. **Directory matters**: All Angular commands must run from `APP/` subdirectory
2. **Angular 21 is bleeding edge**: Many docs online are outdated; check angular.dev
3. **Environment files**: Dev uses `environment.development.ts`, prod uses `environment.ts`
4. **Standalone components**: No NgModules; use `imports: [Component]` in component decorator