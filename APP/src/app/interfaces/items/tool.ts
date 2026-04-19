import { Item, ResourceReference, CostSchema } from '../item';

export interface Tool extends Item {
  index: string;
  name: string;
  equipment_category: ResourceReference;
  tool_category: string;
  cost: CostSchema;
  weight?: number;
  desc: string[];
  special: string[];
  url: string;
  contents: any[];
  properties: any[];
}
