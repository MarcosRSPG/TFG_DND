import { Item, ResourceReference, CostSchema } from '../item';

export interface AdventuringGear extends Item {
  desc: string[];
  special: string[];
  equipment_category: ResourceReference;
  gear_category: ResourceReference;
  quantity?: number;
  cost: CostSchema;
  weight?: number;
  url: string;
  contents: any[];
  properties: any[];
}
