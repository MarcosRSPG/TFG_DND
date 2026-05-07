import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Character } from '../../interfaces/Character';
import { CharactersService } from '../../services/characters-service';

@Component({
  selector: 'app-characters',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './characters.html',
  styleUrl: './characters.css',
})
export class Characters implements OnInit {
  private readonly charactersService = inject(CharactersService);
  private readonly router = inject(Router);

  characters = signal<Character[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCharacters();
  }

  async loadCharacters(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.charactersService.getCharacters();
      this.characters.set(data);
    } catch {
      this.error.set('Failed to load characters.');
    } finally {
      this.loading.set(false);
    }
  }

  goToDetail(character: Character): void {
    const id = character._id ?? character.id ?? character.index;
    if (id) this.router.navigate(['/characters', id]);
  }

  confirmDelete(character: Character): void {
    const id = character._id ?? character.id ?? character.index;
    if (id) this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  async deleteCharacter(character: Character): Promise<void> {
    const id = character._id ?? character.id ?? character.index;
    if (!id) return;
    try {
      await this.charactersService.deleteCharacter(id);
      this.characters.update(list => list.filter(c => (c._id ?? c.id ?? c.index) !== id));
    } catch {
      this.error.set('Failed to delete character.');
    } finally {
      this.deletingId.set(null);
    }
  }

  currentHp(c: Character): number {
    return c.hit_points_current ?? c.hit_points;
  }
}
