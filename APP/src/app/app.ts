import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { DinHeader } from './components/din-header/din-header';
import { LoginService } from './services/login-service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DinHeader],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('APP');
  constructor(
    public authService: LoginService,
    private router: Router,
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn() && !this.router.url.includes('login')) {
      this.router.navigate(['/login']);
    }
  }
}

