import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-magic-item-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './magic-item-form.html',
  styleUrl: './magic-item-form.css',
})
export class MagicItemForm implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEditMode = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);
  private returnUrl = '/manual?section=items';

  formData = signal<Partial<Item>>({
    name: '',
    desc: [],
    special: [],
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
    image: '',
    rarity: { name: 'Uncommon' },
    variants: [],
    variant: false,
  });

  // Separate string for textarea (API needs string[], textarea needs string)
  descString = signal('');

  // Rarity options
  rarityOptions = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // Image upload
  imagePreview = signal<string | null>(null);
  originalImageUrl: string | null = null;
  selectedFile: File | null = null;

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) this.returnUrl = returnUrl;

    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.isEditMode.set(true);
      this.loadItemData(itemId);
    }
  }

  private async loadItemData(id: string): Promise<void> {
    try {
      const item = await this.itemsService.getItem(id, 'magicitem');
      
      // Update form data with item data
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        special: item.special || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
        image: item.image || '',
        rarity: item.rarity || { name: 'Uncommon' },
        variants: item.variants || [],
        variant: item.variant || false,
      }));

        // Convert desc array to string for textarea
        const desc = item.desc || [];
        this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');

        // Load existing image preview
        if (item.image) {
          const url = item.image.startsWith('http')
            ? item.image
            : `${environment.API_URL}${item.image}`;
          this.imagePreview.set(url);
          this.originalImageUrl = url;
        }
      } catch (error) {
      console.error('Error loading magic item data:', error);
      this.error.set('Failed to load magic item data');
    }
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Convert desc string to string[] for API
      const descArray = this.descString().trim() ? this.descString().split('\n\n').filter(d => d.trim()) : [];

      const data: Partial<Item> = {
        ...this.formData(),
        desc: descArray,
        equipment_category: {
          index: 'wondrous-items',
          name: 'Wondrous Items',
          url: '/api/2014/equipment-categories/wondrous-items',
        },
      };

      if (this.isEditMode()) {
        // Get the item ID from route
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        
        if (this.selectedFile) {
          const formData = this.buildFormData();
          await this.itemsService.update(itemId, formData, 'magicitem');
        } else {
          await this.itemsService.update(itemId, data, 'magicitem');
        }
      } else {
        if (this.selectedFile) {
          const formData = this.buildFormData();
          await this.itemsService.create(formData, 'magicitem');
        } else {
          await this.itemsService.create(data, 'magicitem');
        }
      }

      window.location.href = this.returnUrl;
    } catch (err) {
      console.error('Error creating magic item:', err);
      this.error.set('Error creating magic item. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'items' },
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  revertImage(): void {
    this.selectedFile = null;
    this.imagePreview.set(this.originalImageUrl);
    const input = document.getElementById('image') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private buildFormData(): FormData {
    const formData = new FormData();

    // Append all form data fields
    const data = this.formData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof typeof data];
      if (value !== undefined && value !== null && key !== 'image') {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    // Append the image file
    if (this.selectedFile) {
      formData.append('image', this.selectedFile, this.selectedFile.name);
    }

    return formData;
  }
}