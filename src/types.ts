export type Region = 'LCK' | 'LPL' | 'LEC' | 'LCS' | 'Wildcards';

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'coach' | 'reserve';

export interface Player {
  id: string;
  name: string;
  role: Role;
  rating: number;
  photoUrl?: string;
  signatureChampion?: string;
}

export interface TeamRoster {
  top: Player;
  jungle: Player;
  mid: Player;
  adc: Player;
  support: Player;
  coach: Player;
  reserve?: Player;
}

export interface HistoricalTeam {
  id: string;
  name: string;
  year: number;
  region: Region;
  hasWorldsAppearance?: boolean;
  logoUrl?: string;
  roster: TeamRoster;
}

export interface SelectedSlot {
  player: Player | null;
  fromTeam: { name: string; year: number; region: Region } | null;
}

export interface TeamDraft {
  top: SelectedSlot;
  jungle: SelectedSlot;
  mid: SelectedSlot;
  adc: SelectedSlot;
  support: SelectedSlot;
  coach: SelectedSlot;
}

export interface MatchEvent {
  time: string;
  message: string;
  type: 'kill' | 'objective' | 'fight' | 'general' | 'ending';
}

export interface MatchSimulator {
  opponent: HistoricalTeam;
  playerScore: number;
  opponentScore: number;
  events: MatchEvent[];
  status: 'pending' | 'simulating' | 'win' | 'loss';
  progress: number; // 0 to 100%
  winChance: number;
  targetKills?: number;
  targetDeaths?: number;
  currentKills?: number;
  currentDeaths?: number;
}
