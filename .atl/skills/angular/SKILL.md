---
name: angular
description: >
  Angular development patterns following project conventions.
  Trigger: When writing Angular code, components, services, or pages.
license: Apache-2.0
metadata:
  author: luis
  version: "1.0"
---

## When to Use

- Creating new components in `components/` or `pages/`
- Creating new services in `services/`
- Creating new interfaces in `interfaces/`
- Setting up routes in `app.routes.ts`
- Any Angular-related code

## Critical Patterns

### Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Components/Pages | `nombre.ts` | `monsters.ts`, `login.ts` |
| Services | `nombreService.ts` | `monstersService.ts`, `loginService.ts` |
| Interfaces | `PascalCase.ts` | `Monster.ts`, `Race.ts` |
| Templates | Same name, `.html` | `monsters.html` |
| Styles | Same name, `.css` | `monsters.css` |

### File Structure

```
app/
├── components/
│   └── nombre/
│       ├── nombre.ts      # Componente principal
│       ├── nombre.html   # Template
│       └── nombre.css    # Estilos
├── pages/
│   ├── nombre/
│   │   ├── nombre.ts
│   │   ├── nombre.html
│   │   └── nombre.css
├── services/
│   └── nombreService.ts
├── interfaces/
│   └── Nombre.ts
└── app.routes.ts
```

### Use Signals for State

Always use `signal()` for reactive state in components:

```typescript
// State
monsters = signal<Monster[]>([]);
loading = signal(true);
error = signal<string | null>(null);

// Update
this.monsters.set(data);
this.loading.set(false);
```

### Use HttpClient for API Calls

```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MonstersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  getMonsters(): Observable<Monster[]> {
    return this.http.get<Monster[]>(`${this.apiUrl}/monsters/`);
  }

  getMonster(id: string): Observable<Monster> {
    return this.http.get<Monster>(`${this.apiUrl}/monsters/${id}`);
  }
}
```

Component usage:
```typescript
private readonly monstersService = inject(MonstersService);

async ngOnInit(): Promise<void> {
  try {
    const data = await firstValueFrom(this.monstersService.getMonsters());
    this.monsters.set(data);
  } catch (error) {
    this.error.set('No se han podido cargar los monsters.');
  } finally {
    this.loading.set(false);
  }
}
```

### Lazy Loading in Routes

When adding routes, use lazy loading:

```typescript
{
  path: 'monsters',
  loadComponent: () => import('./pages/monsters/monsters').then(m => m.Monsters),
  title: 'Monsters',
},
```

**IMPORTANT**: Always notify before implementing lazy loading.

### CSS Organization

- Put shared/reusable styles in `css/` folder
- Component-specific styles go in individual `.css`
- Use CSS variables for common values

### No Verbose Comments

Keep code self-explanatory. Avoid obvious comments:

```typescript
// BAD
// This function gets all monsters
getMonsters() { ... }

// GOOD
getMonsters() { ... }
```

## Component Template

```typescript
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nombre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './nombre.html',
  styleUrl: './nombre.css',
})
export class Nombre implements OnInit {
  private readonly service = inject(NombreService);

  items = signal<Nombre[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.service.getAll());
      this.items.set(data);
    } catch (error) {
      this.error.set('No se han podido cargar los elementos.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

## Service Template

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Nombre } from '../interfaces/Nombre';

@Injectable({ providedIn: 'root' })
export class NombreService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  getAll(): Observable<Nombre[]> {
    return this.http.get<Nombre[]>(`${this.apiUrl}/nombre/`);
  }

  getById(id: string): Observable<Nombre> {
    return this.http.get<Nombre>(`${this.apiUrl}/nombre/${id}`);
  }
}
```

## Commands

```bash
# Development
cd APP
npm start

# Build
npm run build

# Test
npm test
```

## Important Rules

1. **ALWAYS notify before applying lazy loading** — user wants to be informed
2. **ALWAYS specify file path when making changes** — no silent changes
3. **Use signals for all component state**
4. **Use HttpClient for all API calls**
5. **Separate TS/HTML/CSS in different files**
6. **No verbose comments**
7. **Code should be clean, clear, and useful**