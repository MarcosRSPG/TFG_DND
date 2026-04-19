export interface ResourceReference {
  index: string;
  name: string;
  url: string;
}

export interface CostSchema {
  quantity: number;
  unit: string;
}

export interface Item {
  index: string;
  name: string;
  desc?: string[];
  special?: string[];
  equipment_category?: ResourceReference;
  cost?: CostSchema;
  weight?: number;
  url?: string;
  [key: string]: any;
}
