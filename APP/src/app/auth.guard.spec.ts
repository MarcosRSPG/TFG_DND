import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { authGuard } from './auth.guard';
import { LoginService } from './services/login-service';

describe('authGuard', () => {
  function configure(loggedIn: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: LoginService,
          useValue: {
            isLoggedIn: signal(loggedIn).asReadonly(),
          },
        },
      ],
    });
  }

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));
  }

  it('allows navigation when the user is logged in', () => {
    configure(true);

    expect(runGuard('/characters/new')).toBe(true);
  });

  it('redirects guests to login and preserves the target url', () => {
    configure(false);

    const result = runGuard('/characters/new');
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirectTo=%2Fcharacters%2Fnew');
  });
});
