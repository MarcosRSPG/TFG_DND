import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

@Component({
  selector: 'app-mount-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mount-form.html',
  styleUrl: './mount-form.css',
})
export class MountForm implements OnInit {
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
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
    vehicle_category: '',
    capacity: '',
    speed: { quantity: 0, unit: 'ft.' },
  });

  // Separate string for textarea
  descString = signal('');

  // Vehicle categories
  vehicleCategories = ['Mount', 'Tack', 'Harness', 'Vehicle (Land)', 'Vehicle (Water)', 'Vehicle (Air)'];

  // Speed units
  speedUnits = ['ft.', 'mph', 'km/h'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

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
      const item = await this.itemsService.getItem(id, 'mount');
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
        vehicle_category: item.vehicle_category || '',
        capacity: item.capacity || '',
        speed: item.speed || { quantity: 0, unit: 'ft.' },
      }));

      // Convert desc array to string for textarea
      const desc = item.desc || [];
      this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');
    } catch (error) {
      console.error('Error loading mount/vehicle data:', error);
      this.error.set('Failed to load mount/vehicle data');
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
          index: 'mounts-and-vehicles',
          name: 'Mounts and Vehicles',
          url: '/api/2014/equipment-categories/mounts-and-vehicles',
        },
      };

      if (this.isEditMode()) {
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        await this.itemsService.update(itemId, data, 'mount');
      } else {
        await this.itemsService.create(data, 'mount');
      }

      window.location.href = this.returnUrl;
    } catch (err) {
      console.error('Error creating mount/vehicle:', err);
      this.error.set('Error creating mount/vehicle. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'items' },
    });
  }
}
