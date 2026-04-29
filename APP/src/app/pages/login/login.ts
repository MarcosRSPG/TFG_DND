import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Alerts, AlertVariant } from '../../components/alerts/alerts';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, Alerts],
  templateUrl: './login.html',
  styleUrls: ['./login.css', '../../css/boards.css'],
})
export class Login {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  isAlertOpen = false;
  alertTitle = 'Notice';
  alertMessage = '';
  alertVariant: AlertVariant = 'info';

  async login() {
    try {
      await this.loginService.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      this.showAlert('Login failed', this.getErrorMessage(error), 'error');
    }
  }

  closeAlert(): void {
    this.isAlertOpen = false;
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
