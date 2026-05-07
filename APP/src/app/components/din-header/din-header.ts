import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'comp-din-header',
  imports: [RouterLink],
  templateUrl: './din-header.html',
  styleUrls: ['./din-header.css', '../../css/boards.css']
})
export class DinHeader {
    constructor(
      public authService: LoginService,
    ) {}
    
}
