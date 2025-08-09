export interface Patch {
  id: number;
  title: string;
  description: string;
  version?: number;
  parentId?: number;
  isLatest?: boolean;
  sub_fifth: number;
  overtone: number;
  ultra_saw: number;
  saw: number;
  pulse_width: number;
  square: number;
  metalizer: number;
  triangle: number;
  cutoff: number;
  mode: number;
  resonance: number;
  env_amt: number;
  brute_factor: number;
  kbd_tracking: number;
  modmatrix: ModMatrixEntry[];
  octave: number;
  volume: number;
  glide: number;
  mod_wheel: number;
  amount: number;
  wave: number;
  rate: number;
  sync: number;
  env_amt_2: number;
  vca: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pattern: number;
  play: number;
  rate_2: number;
  created_at: string;
  updated_at: string;
  average_rating: string;
  tags?: string[];
  username?: string; // User who created the patch
  category?: string; // Patch category for organization
  isPublic?: boolean; // Visibility: true = public, false = private (default: true for backward compatibility)
  [key: string]: any;
}

export interface ModMatrixEntry {
  source: string;
  target: string;
}

export interface PatchVersion {
  id: number;
  patchId: number;
  version: number;
  title: string;
  description: string;
  changes: string;
  patchData: Omit<Patch, 'id' | 'version' | 'parentId' | 'isLatest'>;
  created_at: string;
  created_by: string;
}

export interface PatchHistory {
  patchId: number;
  versions: PatchVersion[];
  totalVersions: number;
}

export interface PatchCollection {
  id: number;
  name: string;
  description: string;
  userId: string;
  patchIds: number[];
  isPublic: boolean;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface PatchCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface PatchSearchFilters {
  category?: string;
  tags?: string[];
  minRating?: number;
  maxRating?: number;
  dateFrom?: string;
  dateTo?: string;
  username?: string;
  hasAudio?: boolean;
  synthesisParams?: {
    [key: string]: {
      min?: number;
      max?: number;
    };
  };
}

export interface PatchComparison {
  patch1: Patch;
  patch2: Patch;
  differences: {
    field: string;
    value1: any;
    value2: any;
    type: 'added' | 'removed' | 'modified';
  }[];
  similarity: number;
}
