import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css', '../../css/boards.css'],
})
export class Login {
  email: string = '';
  password: string = '';

  constructor(private loginService: LoginService, private router: Router) {}

  async login() {
    try {
      await this.loginService.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (error: any) {
      alert('Login failed: ' + error.message);
    }
  }
}
