import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Login } from './login';
import { LoginService } from '../../services/login-service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;
  let redirectTo: string | null;
  let loginServiceMock: {
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    redirectTo = null;
    loginServiceMock = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(redirectTo ? { redirectTo } : {});
              },
            },
          },
        },
      ],
    })
      .overrideProvider(LoginService, { useValue: loginServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the modal when login fails', async () => {
    loginServiceMock.login.mockRejectedValue(new Error('Invalid credentials'));

    component.email = 'test@example.com';
    component.password = 'secret';
    fixture.detectChanges();

    await component.login();
    fixture.detectChanges();

    expect(component.isAlertOpen).toBe(true);
    expect(component.alertTitle).toBe('Login failed');
    expect(component.alertMessage).toBe('Invalid credentials');
    expect(fixture.nativeElement.textContent).toContain('Invalid credentials');
  });

  it('should redirect to the requested route after login', async () => {
    redirectTo = '/characters/new';
    loginServiceMock.login.mockResolvedValue({ access_token: 'token' });

    component.email = 'test@example.com';
    component.password = 'secret';

    await component.login();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/characters/new');
  });
});
