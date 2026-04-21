import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class TokenHashService {
  generateHash(token: string): string {
    return CryptoJS.SHA256(token).toString();
  }
}
