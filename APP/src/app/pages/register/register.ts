import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Alerts, AlertVariant } from '../../components/alerts/alerts';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, Alerts],
  templateUrl: './register.html',
  styleUrls: ['./register.css', '../../css/boards.css'],
})
export class Register {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private shouldLoginAfterAlert = false;

  email = '';
  password = '';
  confirmPassword = '';
  name = '';
  isAlertOpen = false;
  alertTitle = 'Notice';
  alertMessage = '';
  alertVariant: AlertVariant = 'info';

  async register() {
    if (this.password !== this.confirmPassword) {
      this.showAlert('Registration error', 'Passwords do not match', 'error');
      return;
    }

    try {
      await this.loginService.register(this.name, this.email, this.password);
      this.shouldLoginAfterAlert = true;
      this.showAlert('Registration successful', 'Registration successful!', 'success');
    } catch (error: unknown) {
      this.showAlert('Registration failed', this.getErrorMessage(error), 'error');
    }
  }

  async closeAlert(): Promise<void> {
    this.isAlertOpen = false;

    if (!this.shouldLoginAfterAlert) {
      return;
    }

    this.shouldLoginAfterAlert = false;

    try {
      await this.loginService.login(this.email, this.password);
      await this.router.navigate(['/']);
    } catch (error: unknown) {
      this.showAlert('Login failed', this.getErrorMessage(error), 'error');
    }
  }

  private showAlert(title: string, message: string, variant: AlertVariant = 'info'): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertVariant = variant;
    this.isAlertOpen = true;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message);
    }

    return 'An unexpected error occurred.';
  }
}
