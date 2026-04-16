import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Monster } from '../../interfaces/monster';
import { MonstersService } from '../../services/monsters-service';

@Component({
  selector: 'app-monster-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './monster-detail.html',
  styleUrl: './monster-detail.css',
})
export class MonsterDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly monstersService = inject(MonstersService);

  monster = signal<Monster | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        throw new Error('No monster id provided');
      }

      const monster = await this.monstersService.getMonster(id);
      this.monster.set(monster);
    } catch (error) {
      console.error('Error loading monster detail:', error);
      this.error.set('No se ha podido cargar el detalle del monster.');
    } finally {
      this.loading.set(false);
    }
  }
}