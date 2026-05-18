import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Alerts, AlertVariant } from '../../components/alerts/alerts';
import { LoginService } from '../../services/login-service';
import { TranslationService } from '../../services/translation.service';

type DeleteState = 'idle' | 'confirming';

const SOURCE = {
  title: 'My Account',
  sectionProfile: 'Profile',
  sectionPassword: 'Change Password',
  sectionLanguage: 'Language',
  sectionDanger: 'Danger zone',
  labelUsername: 'Username',
  labelEmail: 'Email',
  labelCurrentPwd: 'Current password',
  labelNewPwd: 'New password',
  labelConfirmPwd: 'Confirm new password',
  labelLanguage: 'Interface language',
  btnSave: 'Save',
  btnUpdatePwd: 'Update password',
  btnDeleteConfirm: 'Yes, delete my account',
  btnCancel: 'Cancel',
  btnDelete: 'Delete account',
  btnLogout: 'Logout',
  dangerText: 'Deleting your account is permanent. All your characters and data will be lost.',
  confirmText: 'Are you sure? This action cannot be undone.',
  noTranslationHint: 'Translation API not available in this browser. UI will stay in English.',
  downloadingHint: 'Downloading translation model...',
};

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule, Alerts],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile implements OnInit {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  readonly translation = inject(TranslationService);

  username = signal('');
  email = signal('');
  originalUsername = signal('');
  originalEmail = signal('');

  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  selectedLang = signal<string>(this.translation.selectedLanguage());

  isLoading = signal(false);
  deleteState = signal<DeleteState>('idle');
  userId = signal<string | null>(null);

  labels = signal({ ...SOURCE });

  isAlertOpen = false;
  alertTitle = 'Notice';
  alertMessage = '';
  alertVariant: AlertVariant = 'info';
  private postAlertAction: 'none' | 'logout' = 'none';

  constructor() {
    effect(() => {
      const lang = this.translation.selectedLanguage();
      this.selectedLang.set(lang);
      void this.retranslate();
    });
  }

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const id = await this.loginService.getUserId();
      if (!id) {
        await this.router.navigate(['/login']);
        return;
      }
      this.userId.set(id);
      const token = localStorage.getItem('token');
      if (token) {
        const user = await this.loginService.verifyToken(token);
        if (user) {
          this.username.set(
            (user as { username?: string; name?: string }).username ??
              (user as { name?: string }).name ??
              '',
          );
          this.email.set((user as { email?: string }).email ?? '');
          this.originalUsername.set(this.username());
          this.originalEmail.set(this.email());
        }
      }
    } catch (err) {
      this.showAlert('Error', this.getErrorMessage(err), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async retranslate(): Promise<void> {
    const keys = Object.keys(SOURCE) as (keyof typeof SOURCE)[];
    const translated = await this.translation.translateAll(keys.map((k) => SOURCE[k]));
    const result = { ...SOURCE };
    keys.forEach((k, i) => {
      result[k] = translated[i];
    });
    this.labels.set(result);
  }

  async saveProfile(): Promise<void> {
    const id = this.userId();
    if (!id) return;
    const payload: { username?: string; email?: string } = {};
    if (this.username() !== this.originalUsername()) payload.username = this.username();
    if (this.email() !== this.originalEmail()) payload.email = this.email();
    if (!payload.username && !payload.email) {
      this.showAlert('Nothing to save', 'No changes detected.', 'info');
      return;
    }
    this.isLoading.set(true);
    try {
      const res = await this.loginService.updateUser(id, payload);
      if (res.access_token) localStorage.setItem('token', res.access_token);
      this.originalUsername.set(this.username());
      this.originalEmail.set(this.email());
      this.showAlert('Profile updated', 'Your profile has been saved.', 'success');
    } catch (err) {
      this.showAlert('Update failed', this.getErrorMessage(err), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePassword(): Promise<void> {
    const id = this.userId();
    if (!id) return;
    if (!this.currentPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.showAlert('Password change', 'All password fields are required.', 'error');
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.showAlert('Password change', 'New passwords do not match.', 'error');
      return;
    }
    if (this.newPassword() === this.currentPassword()) {
      this.showAlert('Password change', 'New password must be different from current.', 'error');
      return;
    }
    this.isLoading.set(true);
    try {
      const res = await this.loginService.updateUser(id, {
        password: this.newPassword(),
        current_password: this.currentPassword(),
      });
      if (res.access_token) localStorage.setItem('token', res.access_token);
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.showAlert('Password changed', 'Your password has been updated.', 'success');
    } catch (err) {
      this.showAlert('Password change failed', this.getErrorMessage(err), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onLanguageChange(lang: string): Promise<void> {
    try {
      await this.translation.setLanguage(lang);
    } catch (err) {
      this.showAlert('Language', this.getErrorMessage(err), 'error');
    }
  }

  requestDelete(): void {
    this.deleteState.set('confirming');
  }

  cancelDelete(): void {
    this.deleteState.set('idle');
  }

  async confirmDelete(): Promise<void> {
    const id = this.userId();
    if (!id) return;
    this.isLoading.set(true);
    try {
      await this.loginService.deleteAccount(id);
      this.postAlertAction = 'logout';
      this.showAlert('Account deleted', 'Your account has been removed.', 'success');
    } catch (err) {
      this.showAlert('Delete failed', this.getErrorMessage(err), 'error');
    } finally {
      this.isLoading.set(false);
      this.deleteState.set('idle');
    }
  }

  logout(): void {
    this.loginService.logout();
  }

  closeAlert(): void {
    this.isAlertOpen = false;
    if (this.postAlertAction === 'logout') {
      this.postAlertAction = 'none';
      this.loginService.logout();
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
      if (typeof detail === 'string' && detail.trim()) return detail;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'An unexpected error occurred.';
  }
}
