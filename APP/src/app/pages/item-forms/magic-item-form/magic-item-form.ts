import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

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

  isSubmitting = signal(false);
  error = signal<string | null>(null);

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

  // Rarity options
  rarityOptions = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // Image upload
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const data: Partial<Item> = {
        ...this.formData(),
        equipment_category: {
          index: 'wondrous-items',
          name: 'Wondrous Items',
          url: '/api/2014/equipment-categories/wondrous-items',
        },
      };

      if (this.selectedFile) {
        const formData = this.buildFormData();
        await this.itemsService.create(formData, 'magicitem');
      } else {
        await this.itemsService.create(data, 'magicitem');
      }

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
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
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
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