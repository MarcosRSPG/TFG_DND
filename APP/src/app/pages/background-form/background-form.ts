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

  // Custom equipment model
  customEquipmentNameModel = '';
  customEquipmentQuantityModel = 1;

  // Items list for equipment selection
  itemsList = signal<Item[]>([]);
  filteredItems = signal<Item[]>([]);
  itemsLoading = signal(false);

  // Items filter
  itemsFilter = signal('');
  showProficiencyDropdown = signal(false);
  showEquipmentDropdown = signal(false);
  showOtherEquipmentField = signal(false);

  // Proficiency choice groups (new feature)
  proficiencyChoiceGroups = signal<{ count: number; options: string[] }[]>([]);
  proficiencyChoiceFilter = signal('');
  proficiencyChoiceDropdownOpen = signal(false);

  // Equipment choice groups
  equipmentChoiceGroups = signal<{ count: number; items: { index: string; name: string; quantity: number }[] }[]>([]);
  equipmentChoiceFilter = signal('');
  equipmentChoiceDropdownOpen = signal(false);

  // Keyboard highlight index for each dropdown (-1 = nothing highlighted)
  proficiencyHighlight = signal(-1);
  equipmentHighlight = signal(-1);
  profChoiceHighlight = signal(-1);
  equipChoiceHighlight = signal(-1);

  // Filtered items based on search
  get itemsOptions(): Item[] {
    const query = this.itemsFilter().toLowerCase();
    if (!query) return this.filteredItems();
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
    if (!query) return this.dndOptions.proficiencies();
    return this.dndOptions.proficiencies().filter(p =>
      p.name.toLowerCase().includes(query) || p.index.toLowerCase().includes(query)
    );
  }

  onProficiencyFocus(): void {
    this.showProficiencyDropdown.set(true);
  }

  onProficiencyGroupFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.showProficiencyDropdown.set(false);
      this.proficiencyHighlight.set(-1);
    }
  }

  onProficiencyInputChange(value: string): void {
    this.proficiencyFilter.set(value);
    this.showProficiencyDropdown.set(true);
    this.proficiencyHighlight.set(-1);
  }

  onEquipmentFocus(): void {
    this.showEquipmentDropdown.set(true);
  }

  onEquipmentGroupFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.showEquipmentDropdown.set(false);
      this.equipmentHighlight.set(-1);
    }
  }

  onEquipmentInputChange(value: string): void {
    this.itemsFilter.set(value);
    this.showEquipmentDropdown.set(true);
    this.equipmentHighlight.set(-1);
  }

  // ── Keyboard handlers para inputs de filtro ────────────────────────────────
  // El foco NUNCA sale del input. Tab/ArrowDown mueve el highlight visual.

  private moveHighlight(
    current: number,
    total: number,
    direction: 1 | -1
  ): number {
    if (total === 0) return -1;
    if (current < 0) return direction === 1 ? 0 : total - 1;
    return (current + direction + total) % total;
  }

  onProficiencyFilterKeydown(event: KeyboardEvent): void {
    const options = this.filteredProficiencies;
    const open = this.showProficiencyDropdown() && options.length > 0;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) return;
      const idx = this.proficiencyHighlight();
      const target = options[idx >= 0 ? idx : 0];
      if (target) this.addProficiency(target.index);
    } else if ((event.key === 'Tab' || event.key === 'ArrowDown') && open) {
      event.preventDefault();
      this.proficiencyHighlight.set(this.moveHighlight(this.proficiencyHighlight(), options.length, 1));
    } else if ((event.key === 'ArrowUp') && open) {
      event.preventDefault();
      this.proficiencyHighlight.set(this.moveHighlight(this.proficiencyHighlight(), options.length, -1));
    } else if (event.key === 'Escape') {
      this.showProficiencyDropdown.set(false);
      this.proficiencyHighlight.set(-1);
    }
  }

  onEquipmentFilterKeydown(event: KeyboardEvent): void {
    const options = this.itemsOptions;
    const open = this.showEquipmentDropdown() && options.length > 0;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) return;
      const idx = this.equipmentHighlight();
      const target = options[idx >= 0 ? idx : 0];
      if (target) this.addEquipment(target);
    } else if ((event.key === 'Tab' || event.key === 'ArrowDown') && open) {
      event.preventDefault();
      this.equipmentHighlight.set(this.moveHighlight(this.equipmentHighlight(), options.length, 1));
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      this.equipmentHighlight.set(this.moveHighlight(this.equipmentHighlight(), options.length, -1));
    } else if (event.key === 'Escape') {
      this.showEquipmentDropdown.set(false);
      this.equipmentHighlight.set(-1);
    }
  }

  onProficiencyChoiceFilterKeydown(event: KeyboardEvent, groupIdx: number): void {
    const options = this.getFilteredProficiencyChoices();
    const open = this.isProficiencyChoiceDropdownOpen() && options.length > 0;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) return;
      const idx = this.profChoiceHighlight();
      const target = options[idx >= 0 ? idx : 0];
      if (target) this.addProficiencyChoiceOption(groupIdx, target.index, target.name);
    } else if ((event.key === 'Tab' || event.key === 'ArrowDown') && open) {
      event.preventDefault();
      this.profChoiceHighlight.set(this.moveHighlight(this.profChoiceHighlight(), options.length, 1));
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      this.profChoiceHighlight.set(this.moveHighlight(this.profChoiceHighlight(), options.length, -1));
    } else if (event.key === 'Escape') {
      this.proficiencyChoiceDropdownOpen.set(false);
      this.profChoiceHighlight.set(-1);
    }
  }

  onEquipmentChoiceFilterKeydown(event: KeyboardEvent, groupIdx: number): void {
    const options = this.getFilteredEquipmentOptions();
    const open = this.isEquipmentChoiceDropdownOpen() && options.length > 0;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) return;
      const idx = this.equipChoiceHighlight();
      const target = options[idx >= 0 ? idx : 0];
      if (target) this.addEquipmentChoiceOption(groupIdx, target);
    } else if ((event.key === 'Tab' || event.key === 'ArrowDown') && open) {
      event.preventDefault();
      this.equipChoiceHighlight.set(this.moveHighlight(this.equipChoiceHighlight(), options.length, 1));
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault();
      this.equipChoiceHighlight.set(this.moveHighlight(this.equipChoiceHighlight(), options.length, -1));
    } else if (event.key === 'Escape') {
      this.equipmentChoiceDropdownOpen.set(false);
      this.equipChoiceHighlight.set(-1);
    }
  }

  addProficiency(index: string): void {
    if (!this.selectedProficiencies().includes(index)) {
      this.selectedProficiencies.update(list => [...list, index]);
    }
    this.proficiencyFilter.set('');
    this.showProficiencyDropdown.set(false);
    this.proficiencyHighlight.set(-1);
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

  selectEquipment(item: Item): void {
    const index = item['index'] || item['id'];
    const name = item.name;
    if (!this.selectedEquipment().find(e => e.index === index)) {
      this.selectedEquipment.update(list => [...list, { index, name, quantity: 1 }]);
    }
    this.itemsFilter.set('');
    this.showEquipmentDropdown.set(false);
    this.equipmentHighlight.set(-1);
  }

  // Aliases for template
  addEquipment = this.selectEquipment;

  removeEquipment(index: number): void {
    this.selectedEquipment.update(list => list.filter((_, i) => i !== index));
  }

  // Alias for template
  removeEquipmentByIndex = this.removeEquipment;

  showOtherField(): void {
    this.showEquipmentDropdown.set(false);
    this.showOtherEquipmentField.set(true);
  }

  hideOtherField(): void {
    this.showOtherEquipmentField.set(false);
    this.customEquipmentNameModel = '';
    this.customEquipmentQuantityModel = 1;
  }

  addCustomEquipment(): void {
    const name = this.customEquipmentNameModel.trim();
    const quantity = this.customEquipmentQuantityModel || 1;
    if (!name) return;

    const index = `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    if (!this.selectedEquipment().find(e => e.index === index)) {
      this.selectedEquipment.update(list => [...list, { index, name, quantity }]);
    }
    this.customEquipmentNameModel = '';
    this.customEquipmentQuantityModel = 1;
  }

  onProficiencyChange(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newProficiencies = [...this.selectedProficiencies()];

    while (newProficiencies.length <= index) {
      newProficiencies.push('');
    }

    newProficiencies[index] = select.value;
    this.selectedProficiencies.set(newProficiencies);
  }

  // Proficiency choice group methods
  addProficiencyChoiceGroup(): void {
    this.proficiencyChoiceGroups.update(groups => [...groups, { count: 1, options: [] }]);
  }

  removeProficiencyChoiceGroup(index: number): void {
    this.proficiencyChoiceGroups.update(groups => groups.filter((_, i) => i !== index));
  }

  updateProficiencyChoiceCount(groupIndex: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 1;
    this.proficiencyChoiceGroups.update(groups => {
      const newGroups = [...groups];
      newGroups[groupIndex] = { ...newGroups[groupIndex], count: value };
      return newGroups;
    });
  }

  getProficiencyChoiceFilter(): string {
    return this.proficiencyChoiceFilter();
  }

  setProficiencyChoiceFilter(value: string): void {
    this.proficiencyChoiceFilter.set(value);
    if (value) this.proficiencyChoiceDropdownOpen.set(true);
    this.profChoiceHighlight.set(-1);
  }

  isProficiencyChoiceDropdownOpen(): boolean {
    return this.proficiencyChoiceDropdownOpen();
  }

  getFilteredProficiencyChoices(): DndProficiency[] {
    const query = this.proficiencyChoiceFilter().toLowerCase();
    if (!query) return this.dndOptions.proficiencies().slice(0, 20);
    return this.dndOptions.proficiencies()
      .filter(p => p.name.toLowerCase().includes(query) || p.index.toLowerCase().includes(query))
      .slice(0, 20);
  }

  openProficiencyChoiceDropdown(): void {
    this.proficiencyChoiceDropdownOpen.set(true);
  }

  onProfChoiceGroupFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.proficiencyChoiceDropdownOpen.set(false);
      this.proficiencyChoiceFilter.set('');
    }
  }

  addProficiencyChoiceOption(groupIndex: number, profIndex: string, profName: string): void {
    this.proficiencyChoiceGroups.update(groups => {
      const newGroups = [...groups];
      const current = newGroups[groupIndex].options;
      if (!current.includes(profName)) {
        newGroups[groupIndex] = { 
          ...newGroups[groupIndex], 
          options: [...current, profName] 
        };
      }
      return newGroups;
    });
    this.proficiencyChoiceFilter.set('');
    this.proficiencyChoiceDropdownOpen.set(false);
    this.profChoiceHighlight.set(-1);
  }

  removeProficiencyChoiceOption(groupIndex: number, optionIndex: number): void {
    this.proficiencyChoiceGroups.update(groups => {
      const newGroups = [...groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        options: newGroups[groupIndex].options.filter((_, i) => i !== optionIndex)
      };
      return newGroups;
    });
  }

  // Equipment choice group methods
  addEquipmentChoiceGroup(): void {
    this.equipmentChoiceGroups.update(groups => [...groups, { count: 1, items: [] }]);
  }

  removeEquipmentChoiceGroup(index: number): void {
    this.equipmentChoiceGroups.update(groups => groups.filter((_, i) => i !== index));
  }

  updateEquipmentChoiceCount(groupIndex: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 1;
    this.equipmentChoiceGroups.update(groups => {
      const newGroups = [...groups];
      newGroups[groupIndex] = { ...newGroups[groupIndex], count: value };
      return newGroups;
    });
  }

  getEquipmentChoiceFilter(): string {
    return this.equipmentChoiceFilter();
  }

  setEquipmentChoiceFilter(value: string): void {
    this.equipmentChoiceFilter.set(value);
    if (value) this.equipmentChoiceDropdownOpen.set(true);
    this.equipChoiceHighlight.set(-1);
  }

  isEquipmentChoiceDropdownOpen(): boolean {
    return this.equipmentChoiceDropdownOpen();
  }

  getFilteredEquipmentOptions(): Item[] {
    const query = this.equipmentChoiceFilter().toLowerCase();
    if (!query) return this.filteredItems().slice(0, 20);
    return this.filteredItems()
      .filter(item => item.name.toLowerCase().includes(query))
      .slice(0, 20);
  }

  openEquipmentChoiceDropdown(): void {
    this.equipmentChoiceDropdownOpen.set(true);
  }

  onEquipChoiceGroupFocusOut(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.equipmentChoiceDropdownOpen.set(false);
      this.equipmentChoiceFilter.set('');
    }
  }

  addEquipmentChoiceOption(groupIndex: number, item: Item): void {
    const index = item['index'] || item['id'];
    const name = item.name;
    this.equipmentChoiceGroups.update(groups => {
      const newGroups = [...groups];
      const current = newGroups[groupIndex].items;
      if (!current.find(e => e.index === index)) {
        newGroups[groupIndex] = { 
          ...newGroups[groupIndex], 
          items: [...current, { index, name, quantity: 1 }] 
        };
      }
      return newGroups;
    });
    this.equipmentChoiceFilter.set('');
    this.equipmentChoiceDropdownOpen.set(false);
    this.equipChoiceHighlight.set(-1);
  }

  removeEquipmentChoiceOption(groupIndex: number, itemIndex: number): void {
    this.equipmentChoiceGroups.update(groups => {
      const newGroups = [...groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        items: newGroups[groupIndex].items.filter((_, i) => i !== itemIndex)
      };
      return newGroups;
    });
  }

  updateEquipmentChoiceQuantity(groupIndex: number, itemIndex: number, quantity: number): void {
    this.equipmentChoiceGroups.update(groups => {
      const newGroups = [...groups];
      if (newGroups[groupIndex].items[itemIndex]) {
        newGroups[groupIndex].items[itemIndex] = {
          ...newGroups[groupIndex].items[itemIndex],
          quantity
        };
      }
      return newGroups;
    });
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
    switch (type) {
      case 'personality_traits':
        this.personalityTraitsOptions.update(opts => [...opts, '']);
        break;
      case 'ideals':
        this.idealsOptions.update(opts => [...opts, '']);
        break;
      case 'bonds':
        this.bondsOptions.update(opts => [...opts, '']);
        break;
      case 'flaws':
        this.flawsOptions.update(opts => [...opts, '']);
        break;
    }
  }

  removeOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number): void {
    switch (type) {
      case 'personality_traits':
        this.personalityTraitsOptions.update(opts => opts.filter((_, i) => i !== index));
        break;
      case 'ideals':
        this.idealsOptions.update(opts => opts.filter((_, i) => i !== index));
        break;
      case 'bonds':
        this.bondsOptions.update(opts => opts.filter((_, i) => i !== index));
        break;
      case 'flaws':
        this.flawsOptions.update(opts => opts.filter((_, i) => i !== index));
        break;
    }
  }

  updateOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number, value: string): void {
    switch (type) {
      case 'personality_traits':
        this.personalityTraitsOptions.update(opts => {
          const newOpts = [...opts];
          newOpts[index] = value;
          return newOpts;
        });
        break;
      case 'ideals':
        this.idealsOptions.update(opts => {
          const newOpts = [...opts];
          newOpts[index] = value;
          return newOpts;
        });
        break;
      case 'bonds':
        this.bondsOptions.update(opts => {
          const newOpts = [...opts];
          newOpts[index] = value;
          return newOpts;
        });
        break;
      case 'flaws':
        this.flawsOptions.update(opts => {
          const newOpts = [...opts];
          newOpts[index] = value;
          return newOpts;
        });
        break;
    }
  }

  getOptions(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws'): string[] {
    switch (type) {
      case 'personality_traits':
        return this.personalityTraitsOptions();
      case 'ideals':
        return this.idealsOptions();
      case 'bonds':
        return this.bondsOptions();
      case 'flaws':
        return this.flawsOptions();
      default:
        return [];
    }
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

      const toDescArray = (val: string | string[] | undefined): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(d => d.trim());
        return val.trim() ? [val.trim()] : [];
      };

      const featureData: any = {
        name: feature?.name,
        desc: toDescArray(feature?.desc as string | string[] | undefined),
        is_variant: feature?.is_variant,
      };
      if (feature?.is_variant && feature.variant?.name) {
        featureData.variant = {
          name: feature.variant.name,
          desc: toDescArray(feature.variant.desc as string | string[] | undefined),
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