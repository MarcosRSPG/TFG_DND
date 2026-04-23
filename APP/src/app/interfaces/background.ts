export interface Background {
  id?: string;
  name: string;
  starting_proficiencies?: BackgroundReference[];
  starting_equipment?: BackgroundEquipment[];
  starting_equipment_options?: Array<{ desc?: string }>;
  feature?: {
    name: string;
    desc?: string;
    variant?: string;
  };
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  image?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface BackgroundReference {
  index: string;
  name: string;
  url: string;
}

export interface BackgroundEquipment {
  equipment: BackgroundReference;
  quantity: number;
}