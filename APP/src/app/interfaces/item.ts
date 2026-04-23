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
  id?: string;
  name: string;
  desc?: string[];
  special?: string[];
  equipment_category?: ResourceReference;
  cost?: CostSchema;
  weight?: number;
  image?: string;
  url?: string;
  // Weapon specific
  weapon_category?: string;
  weapon_range?: string;
  damage?: {
    damage_dice?: string;
    damage_type?: ResourceReference;
  };
  range?: {
    normal?: number;
    long?: number;
  };
  properties?: ResourceReference[];
  two_handed_damage?: {
    damage_dice?: string;
    damage_type?: ResourceReference;
  };
  // Armor specific
  armor_category?: string;
  armor_class?: {
    base: number;
    dex_bonus?: boolean;
  };
  str_minimum?: number;
  stealth_disadvantage?: boolean;
  // Tool specific
  tool_category?: string;
  // Magic Item specific
  rarity?: {
    name: string;
  };
  variants?: ResourceReference[];
  variant?: boolean;
  // Mount/Vehicle specific
  vehicle_category?: string;
  capacity?: string;
  speed?: {
    quantity: number;
    unit: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}