import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css', '../../css/boards.css'],
})
export class Register {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  confirmPassword = '';
  name = '';

  async register() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await this.loginService.register(this.name, this.email, this.password);
      alert('Registration successful!');
      await this.loginService.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (error: any) {
      alert('Registration failed: ' + error.message);
    }
  }
}