export interface ProgressionEntry {
  level: number;
  value: string;
}

export interface ProgressionColumn {
  id: string;
  label: string;
  cssClass: string;
  source?: 'class_specific' | 'spellcasting'; // Optional: if present, read from API data
  key?: string; // Optional: if present, read this key from the source
  progression: ProgressionEntry[];
}

export interface ClassProgressionConfig {
  hiddenKeys?: string[]; // Keys to hide from API data
  spellSlots?: boolean; // Whether to show spell slots for this class
  progressionColumns: ProgressionColumn[];
}

export interface AllClassesProgressionConfig {
  [className: string]: ClassProgressionConfig;
}
