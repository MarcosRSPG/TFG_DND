export interface Background {
  id?: string;
  index: string;
  name: string;
  starting_proficiencies?: BackgroundReference[];
  starting_equipment?: BackgroundEquipment[];
  starting_equipment_options?: Array<{ desc?: string }>;
  feature?: {
    name: string;
    desc?: string[];
  };
  personality_traits?: {
    desc?: string;
  };
  ideals?: {
    desc?: string;
  };
  bonds?: {
    desc?: string;
  };
  flaws?: {
    desc?: string;
  };
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