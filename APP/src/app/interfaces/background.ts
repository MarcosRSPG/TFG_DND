export interface Background {
  id?: string;
  index: string;
  name: string;
  image?: string;
  starting_proficiencies?: BackgroundReference[];
  starting_equipment?: BackgroundEquipment[];
  starting_equipment_options?: Array<{ desc?: string }>;
  // Multiple proficiency choice groups (e.g., "choose 1 skill from {list}, choose 1 gaming set from {list}")
  starting_proficiency_options?: Array<{
    choose: number;
    type: string;
    options: string[];
  }>;
  feature?: {
    name: string;
    desc?: string[];
    is_variant?: boolean;
    variant?: {
      name: string;
      desc?: string[];
    };
  };
  // API estructura: { from: { options: [{ option_type: 'string', string: '...' }] }
  personality_traits?: BackgroundOptionGroup;
  ideals?: BackgroundOptionGroup;
  bonds?: BackgroundOptionGroup;
  flaws?: BackgroundOptionGroup;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface BackgroundOptionGroup {
  choose?: number;
  type?: string;
  // API format: { from: { options: [...] } }
  from?: {
    option_set_type?: string;
    options?: Array<{
      option_type?: string;
      string?: string;
      desc?: string;
      alignments?: Array<{
        index: string;
        name: string;
        url: string;
      }>;
    }>;
  };
  // Legacy form format: { options: [...] }
  options?: string[];
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