import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'comp-din-header',
  imports: [RouterLink],
  templateUrl: './din-header.html',
  styleUrls: ['./din-header.css', '../../css/boards.css'],
})
export class DinHeader {
  readonly isMobileMenuOpen = signal(false);

  constructor(public authService: LoginService) {}

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((isOpen) => !isOpen);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
