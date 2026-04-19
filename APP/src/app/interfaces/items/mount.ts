import { Item, ResourceReference, CostSchema } from '../item';

export interface SpeedSchema {
  quantity: number;
  unit: string;
}

export interface Mount extends Item {
  index: string;
  name: string;
  desc: string[];
  special: string[];
  equipment_category: ResourceReference;
  vehicle_category: string;
  cost: CostSchema;
  speed: SpeedSchema;
  capacity: string;
  url: string;
  contents: any[];
  properties: any[];
}
