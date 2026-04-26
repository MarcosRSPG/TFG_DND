import { HttpInterceptorFn } from '@angular/common/http';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add token to API requests - use SHA256 hash like the other services
  if (req.url.startsWith(environment.API_URL) || req.url.startsWith(environment.API_DND_OFICIAL)) {
    const tokenHash = CryptoJS.SHA256(environment.API_TOKEN).toString();
    const modifiedReq = req.clone({
      setHeaders: {
        'X-API-Token': tokenHash,
      },
    });
    return next(modifiedReq);
  }
  return next(req);
};