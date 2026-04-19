import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ItemsService, ItemType, ItemSpecific } from '../../../services/items-service';

import { WeaponDetailComponent } from '../weapon-detail/weapon-detail';
import { ArmorDetailComponent } from '../armor-detail/armor-detail';
import { AdventuringGearDetailComponent } from '../adventuring-gear-detail/adventuring-gear-detail';
import { MagicItemDetailComponent } from '../magic-item-detail/magic-item-detail';
import { ToolDetailComponent } from '../tool-detail/tool-detail';
import { MountDetailComponent } from '../mount-detail/mount-detail';

@Component({
  selector: 'app-item-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    WeaponDetailComponent,
    ArmorDetailComponent,
    AdventuringGearDetailComponent,
    MagicItemDetailComponent,
    ToolDetailComponent,
    MountDetailComponent,
  ],
  templateUrl: './item-detail-page.html',
  styleUrl: './item-detail-page.css',
})
export class ItemDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemsService = inject(ItemsService);

  item = signal<ItemSpecific | null>(null);
  type = signal<ItemType | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  backQueryParams: Record<string, string> = {};

  async ngOnInit(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    this.backQueryParams = {
      section: queryParams.get('section') || 'items',
      searchName: queryParams.get('searchName') || '',
      types: queryParams.get('types') || '',
      source: queryParams.get('source') || 'all',
      costMin: queryParams.get('costMin') || '',
      costMax: queryParams.get('costMax') || '',
      page: queryParams.get('page') || '',
    };

    const type = this.route.snapshot.paramMap.get('type') as ItemType;
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Loading item detail:', type, id);

    if (!type || !id) {
      this.error.set('Invalid route.');
      console.error('Invalid route, no type or id');
      this.loading.set(false);
      return;
    }

    this.type.set(type);

    try {
      const data = await this.itemsService.getItem(id, type);
      this.item.set(data);
    } catch (e: any) {
      this.error.set(e?.message || 'Error loading item.');
      console.error('Error loading item:', e);
    } finally {
      this.loading.set(false);
    }
  }
  get weapon() {
  return this.type() === 'weapon' ? this.item() as any : null;
}

get armor() {
  return this.type() === 'armor' ? this.item() as any : null;
}

get gear() {
  return this.type() === 'adventuringgear' ? this.item() as any : null;
}

get magicItem() {
  return this.type() === 'magicitem' ? this.item() as any : null;
}

get tool() {
  return this.type() === 'tool' ? this.item() as any : null;
}

get mount() {
  return this.type() === 'mount' ? this.item() as any : null;
}

get backParams(): Record<string, string> {
  const params: Record<string, string> = { section: this.backQueryParams['section'] || 'items' };
  if (this.backQueryParams['searchName']) params['searchName'] = this.backQueryParams['searchName'];
  if (this.backQueryParams['types']) params['types'] = this.backQueryParams['types'];
  if (this.backQueryParams['source'] && this.backQueryParams['source'] !== 'all') params['source'] = this.backQueryParams['source'];
  if (this.backQueryParams['costMin']) params['costMin'] = this.backQueryParams['costMin'];
  if (this.backQueryParams['costMax']) params['costMax'] = this.backQueryParams['costMax'];
  if (this.backQueryParams['page']) params['page'] = this.backQueryParams['page'];
  return params;
}
}