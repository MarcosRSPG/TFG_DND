import { Component } from '@angular/core';
import { LoginService } from '../../services/login-service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [FormsModule,],
  templateUrl: './register.html',
  styleUrls: ['./register.css', '../../css/boards.css'],
})
export class Register {

email: string = '';
  password: string = '';
  confirmPassword: string = '';
  name: string = '';

  constructor(private loginService: LoginService, private router: Router) {}

    async register() {

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    await this.loginService.register(this.name, this.email, this.password)
      .then(() => {
        alert('Registration successful!');
        this.loginService.login(this.email, this.password)
          .then(() => {
            this.router.navigate(['/']);
          });
      })
      .catch((error) => {
        alert('Registration failed: ' + error.message);
      });
        
    }        
}
