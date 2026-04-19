import { Item, ResourceReference, CostSchema } from '../item';

export interface ArmorClass {
  base: number;
  dex_bonus: boolean;
  max_bonus?: number;
}

export interface Armor extends Item {
  desc: string[];
  special: string[];
  equipment_category: ResourceReference;
  armor_category: string;
  armor_class: ArmorClass;
  str_minimum: number;
  stealth_disadvantage: boolean;
  weight?: number;
  cost: CostSchema;
  url: string;
  contents: any[];
  properties: any[];
}
