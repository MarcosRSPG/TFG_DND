import { Item, ResourceReference, CostSchema } from '../item';

export interface WeaponDamage {
  damage_dice: string;
  damage_type: ResourceReference;
}

export interface WeaponRange {
  normal: number;
  long?: number;
}

export interface Weapon extends Item {
  desc: string[];
  special: string[];
  equipment_category: ResourceReference;
  weapon_category: string;
  weapon_range: string;
  category_range: string;
  cost: CostSchema;
  damage?: WeaponDamage;
  range: WeaponRange;
  weight?: number;
  properties: ResourceReference[];
  url: string;
}
