import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Background } from '../../interfaces/background';
import { BackgroundsService } from '../../services/backgrounds-service';
import { DndOptionsService, DndProficiency } from '../../services/dnd-options-service';
import { ItemsService } from '../../services/items-service';
import { Item } from '../../interfaces/item';
import { VikingCheck } from '../../components/viking-check/viking-check';

@Component({
  selector: 'app-background-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VikingCheck],
  templateUrl: './background-form.html',
  styleUrl: './background-form.css',
})
export class BackgroundForm implements OnInit {
  private readonly backgroundsService = inject(BackgroundsService);
  private readonly dndOptions = inject(DndOptionsService);
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEditMode = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

// Form data
  formData = signal<Partial<Background>>({
    name: '',
    starting_proficiencies: [],
    starting_equipment: [],
    feature: {
      name: '',
      desc: [],
      is_variant: false,
      variant: { name: '', desc: [] },
    },
    personality_traits: { options: [] },
    ideals: { options: [] },
    bonds: { options: [] },
    flaws: { options: [] },
  });

  // For proficiency selection
  selectedProficiencies = signal<string[]>([]);
  proficiencyCount = signal(1);

  // For equipment selection
  selectedEquipment = signal<{ index: string; name: string; quantity: number }[]>([]);

  // Proficiency filter
  proficiencyFilter = signal('');

  // For multiple options in traits/ideals/bonds/flaws
  personalityTraitsOptions = signal<string[]>(['']);
  idealsOptions = signal<string[]>(['']);
  bondsOptions = signal<string[]>(['']);
  flawsOptions = signal<string[]>(['']);

  // Items list for equipment selection
  itemsList = signal<Item[]>([]);
  filteredItems = signal<Item[]>([]);
  itemsLoading = signal(false);

  // Items filter
  itemsFilter = signal('');

  // Filtered items based on search
  get itemsOptions(): Item[] {
    const query = this.itemsFilter().toLowerCase();
    if (!query) return [];
    return this.filteredItems().filter(item =>
      item.name.toLowerCase().includes(query)
    );
  }

  ngOnInit(): void {
    this.dndOptions.loadProficiencies();
    this.loadItems();
  }

  // Expose Array for template
  Array = Array;

  // Available proficiencies
  get proficiencies(): DndProficiency[] {
    return this.dndOptions.proficiencies();
  }

  // Filtered proficiencies based on search
  get filteredProficiencies(): DndProficiency[] {
    const query = this.proficiencyFilter().toLowerCase();
    if (!query) return [];
    return this.dndOptions.proficiencies().filter(p =>
      p.name.toLowerCase().includes(query) || p.index.toLowerCase().includes(query)
    );
  }

  addProficiency(index: string): void {
    if (!this.selectedProficiencies().includes(index)) {
      this.selectedProficiencies.update(list => [...list, index]);
    }
    this.proficiencyFilter.set('');
  }

  removeProficiency(index: number): void {
    this.selectedProficiencies.update(list => list.filter((_, i) => i !== index));
  }

  async loadItems(): Promise<void> {
    this.itemsLoading.set(true);
    try {
      const items = await this.itemsService.getAll();
      this.itemsList.set(items);
      this.filteredItems.set(items);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      this.itemsLoading.set(false);
    }
  }

  onProficiencyInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Find matching proficiency
    const prof = this.filteredProficiencies.find(p => p.name === value);
    if (prof && !this.selectedProficiencies().includes(prof.index)) {
      this.selectedProficiencies.update(list => [...list, prof.index]);
      input.value = '';
    }
  }

  onItemsFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.itemsFilter.set(input.value);
  }

  onEquipmentInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.itemsFilter.set(input.value);
  }

  selectEquipment(item: Item): void {
    const index = item['index'] || item['id'];
    const name = item.name;
    if (!this.selectedEquipment().find(e => e.index === index)) {
      this.selectedEquipment.update(list => [...list, { index, name, quantity: 1 }]);
    }
    this.itemsFilter.set('');
  }

  // Aliases for template
  addEquipment = this.selectEquipment;

  removeEquipment(index: number): void {
    this.selectedEquipment.update(list => list.filter((_, i) => i !== index));
  }

  // Alias for template
  removeEquipmentByIndex = this.removeEquipment;

  onProficiencyChange(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newProficiencies = [...this.selectedProficiencies()];

    while (newProficiencies.length <= index) {
      newProficiencies.push('');
    }

    newProficiencies[index] = select.value;
    this.selectedProficiencies.set(newProficiencies);
  }

  addProficiencyField(): void {
    this.proficiencyCount.update((c) => c + 1);
  }

  removeProficiencyField(): void {
    if (this.proficiencyCount() > 1) {
      this.proficiencyCount.update((c) => c - 1);
      const newProficiencies = [...this.selectedProficiencies()];
      newProficiencies.pop();
      this.selectedProficiencies.set(newProficiencies);
    }
  }

  updateEquipmentQuantity(index: number, quantity: number): void {
    const current = [...this.selectedEquipment()];
    if (current[index]) {
      current[index] = { ...current[index], quantity };
      this.selectedEquipment.set(current);
    }
  }

  // Multiple options methods for traits/ideals/bonds/flaws
  addOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws'): void {
    const current = (this.formData()[type] as { options?: string[] })?.options || [];
    const newArray = [...current, ''];
    this.formData.update(d => ({
      ...d,
      [type]: { options: newArray }
    }));
  }

  removeOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number): void {
    const current = [...((this.formData()[type] as { options?: string[] })?.options || [])];
    current.splice(index, 1);
    this.formData.update(d => ({
      ...d,
      [type]: { options: current }
    }));
  }

  updateOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number, value: string): void {
    const current = [...((this.formData()[type] as { options?: string[] })?.options || [])];
    current[index] = value;
    this.formData.update(d => ({
      ...d,
      [type]: { options: current }
    }));
  }

  getOptions(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws'): string[] {
    return (this.formData()[type] as { options?: string[] })?.options || [];
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Convert selected proficiency indices to BackgroundReference format
      const startingProficiencies = this.selectedProficiencies()
        .filter((p) => p)
        .map((index) => {
          const prof = this.proficiencies.find((p) => p.index === index);
          return {
            index: index,
            name: prof?.name || index,
            url: prof?.url || `/api/2014/proficiencies/${index}`,
          };
        });

      // Convert selected equipment
      const startingEquipment = this.selectedEquipment().map(item => ({
        equipment: {
          index: item.index,
          name: item.name,
          url: `/api/2014/equipment/${item.index}`
        },
        quantity: item.quantity
      }));

      // Build options arrays for traits
      const personalityTraitsOptions = this.personalityTraitsOptions().filter(o => o.trim());
      const idealsOptions = this.idealsOptions().filter(o => o.trim());
      const bondsOptions = this.bondsOptions().filter(o => o.trim());
      const flawsOptions = this.flawsOptions().filter(o => o.trim());

      // Build feature with variant
      const feature = this.formData().feature;
      const featureData: any = {
        name: feature?.name,
        desc: feature?.desc?.filter((d: string) => d.trim()),
        is_variant: feature?.is_variant,
      };
      if (feature?.is_variant && feature.variant?.name) {
        featureData.variant = {
          name: feature.variant.name,
          desc: feature.variant.desc?.filter((d: string) => d.trim()),
        };
      }

const data: Partial<Background> = {
        ...this.formData(),
        feature: featureData,
        starting_proficiencies: startingProficiencies as any,
        starting_equipment: startingEquipment as any,
        personality_traits: {
          options: personalityTraitsOptions.length > 0 ? personalityTraitsOptions : undefined,
        },
        ideals: {
          options: idealsOptions.length > 0 ? idealsOptions : undefined,
        },
        bonds: {
          options: bondsOptions.length > 0 ? bondsOptions : undefined,
        },
        flaws: {
          options: flawsOptions.length > 0 ? flawsOptions : undefined,
        }
      };

      await this.backgroundsService.create(data);

      // Navigate back to backgrounds list
      this.router.navigate(['/manual'], {
        queryParams: { section: 'backgrounds' },
      });
    } catch (err) {
      console.error('Error creating background:', err);
      this.error.set('Error creating background. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'backgrounds' },
    });
  }

  getProficiencyName(index: string): string {
    const prof = this.proficiencies.find(p => p.index === index);
    return prof?.name || index;
  }
}