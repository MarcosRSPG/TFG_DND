import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  isLoggedIn(){
    const token = localStorage.getItem('token');
    return !!token && token.trim() !== '' && token !== 'null' && token !== 'undefined';
  }
}
