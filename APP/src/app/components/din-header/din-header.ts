import { Component } from '@angular/core';
import { LoginService } from '../../services/login-service';

@Component({
  selector: 'comp-din-header',
  imports: [],
  templateUrl: './din-header.html',
  styleUrls: ['./din-header.css', '../../css/boards.css']
})
export class DinHeader {
    constructor(
      public authService: LoginService,
    ) {}
    
}
