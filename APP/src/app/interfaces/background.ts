export interface Background {
  id?: string;
  index: string;
  name: string;
  image?: string;
  starting_proficiencies?: BackgroundReference[];
  starting_equipment?: BackgroundEquipment[];
  starting_equipment_options?: Array<{ desc?: string }>;
  feature?: {
    name: string;
    desc?: string[];
    is_variant?: boolean;
    variant?: {
      name: string;
      desc?: string[];
    };
  };
  personality_traits?: {
    options?: string[];
  };
  ideals?: {
    options?: string[];
  };
  bonds?: {
    options?: string[];
  };
  flaws?: {
    options?: string[];
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