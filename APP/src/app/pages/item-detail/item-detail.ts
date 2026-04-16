import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Item, ItemType } from '../../interfaces/item';
import { ItemsService } from '../../services/items-service';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './item-detail.html',
  styleUrl: './item-detail.css',
})
export class ItemDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly itemsService = inject(ItemsService);

  item = signal<Item | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        throw new Error('No item id provided');
      }

      const typeParam = this.route.snapshot.queryParamMap.get('type');
      const item = await this.itemsService.getItem(id, (typeParam as ItemType | null) ?? null);
      this.item.set(item);
    } catch (error) {
      console.error('Error loading item detail:', error);
      this.error.set('No se ha podido cargar el detalle del item.');
    } finally {
      this.loading.set(false);
    }
  }
}