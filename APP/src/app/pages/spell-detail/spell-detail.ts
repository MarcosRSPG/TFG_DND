import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Spell } from '../../interfaces/spell';
import { SpellsService } from '../../services/spells-service';

@Component({
  selector: 'app-spell-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './spell-detail.html',
  styleUrl: './spell-detail.css',
})
export class SpellDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly spellsService = inject(SpellsService);

  spell = signal<Spell | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        throw new Error('No spell id provided');
      }

      const spell = await this.spellsService.getSpell(id);
      this.spell.set(spell);
    } catch (error) {
      console.error('Error loading spell detail:', error);
      this.error.set('No se ha podido cargar el detalle del spell.');
    } finally {
      this.loading.set(false);
    }
  }
}