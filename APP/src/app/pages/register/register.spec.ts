import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Register } from './register';
import { LoginService } from '../../services/login-service';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let loginServiceMock: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    loginServiceMock = {
      login: vi.fn(),
      register: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [{ provide: Router, useValue: routerMock }],
    })
      .overrideProvider(LoginService, { useValue: loginServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show an error modal when passwords do not match', async () => {
    component.password = 'secret';
    component.confirmPassword = 'another-secret';
    fixture.detectChanges();

    await component.register();
    fixture.detectChanges();

    expect(component.isAlertOpen).toBe(true);
    expect(component.alertTitle).toBe('Registration error');
    expect(component.alertMessage).toBe('Passwords do not match');
    expect(loginServiceMock.register).not.toHaveBeenCalled();
  });

  it('should wait for the modal to close before logging in after registration', async () => {
    loginServiceMock.register.mockResolvedValue({});
    loginServiceMock.login.mockResolvedValue({ access_token: 'token' });

    component.name = 'Test User';
    component.email = 'test@example.com';
    component.password = 'secret';
    component.confirmPassword = 'secret';
    fixture.detectChanges();

    await component.register();

    expect(component.isAlertOpen).toBe(true);
    expect(component.alertTitle).toBe('Registration successful');
    expect(loginServiceMock.login).not.toHaveBeenCalled();

    await component.closeAlert();

    expect(loginServiceMock.login).toHaveBeenCalledWith('test@example.com', 'secret');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
