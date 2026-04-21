import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Subrace } from '../interfaces/subrace';

@Injectable({
  providedIn: 'root',
})
export class SubracesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_DND_OFICIAL;

  // === SIGNALS ===
  private _subraces = signal<Subrace[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Readonly signals
  readonly subraces = this._subraces.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async getSubrace(index: string): Promise<Subrace> {
    return firstValueFrom(
      this.http.get<Subrace>(`${this.apiUrl}/subraces/${index}`)
    );
  }
}
