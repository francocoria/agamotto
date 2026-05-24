// Typed API client for Agamotto backend.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export type Team = {
  team_id: string;
  name: string;
  fifa_code?: string | null;
  confederation: string;
  fifa_rank?: number | null;
  elo?: number | null;
  flag_emoji?: string | null;
};

export type Venue = {
  venue_id: string;
  name: string;
  city: string;
  country: string;
  altitude_m?: number | null;
  capacity?: number | null;
  surface?: string | null;
  roof?: string | null;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type Match = {
  match_id: string;
  tournament_id: string;
  stage: string;
  group_label?: string | null;
  match_number?: number | null;
  kickoff_utc: string;
  venue?: Venue | null;
  home_team?: Team | null;
  away_team?: Team | null;
  home_score?: number | null;
  away_score?: number | null;
  status: string;
};

export type Scoreline = { score: string; p: number };
export type Factor = { name: string; value: number; direction: string; weight: number };

export type MatchPrediction = {
  match_id: string;
  model_version: string;
  as_of: string;
  home_team?: Team | null;
  away_team?: Team | null;
  venue?: Venue | null;
  p_home: number;
  p_draw: number;
  p_away: number;
  lambda_home: number;
  lambda_away: number;
  p_over_2_5?: number | null;
  p_btts?: number | null;
  top_scorelines: Scoreline[];
  top_factors: Factor[];
};

export type TeamOutlook = {
  team_id: string;
  name?: string | null;
  p_group_winner: number;
  p_runner_up: number;
  p_best_third: number;
  p_round_32: number;
  p_round_16: number;
  p_quarter: number;
  p_semi: number;
  p_final: number;
  p_champion: number;
};

export type ChampionEntry = { team: string; p: number; name?: string; flag?: string; confederation?: string };

export type Simulation = {
  simulation_id: number;
  tournament_id: string;
  model_version: string;
  n_runs: number;
  created_at: string;
  champion_distribution: { team: string; p: number }[];
  team_outlook: Record<string, TeamOutlook>;
  sampled_universes: any[];
};

export type BracketSlot = {
  slot_index: number;
  top_team: string;
  p_top: number;
  top_winners: { team: string; p: number }[];
};

export type PivotMatch = {
  match_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  stage: string | null;
  impact_score: number;
};

export const api = {
  teams: () => get<Team[]>("/teams"),
  team: (id: string) => get<Team>(`/teams/${id}`),
  teamOutlook: (id: string) => get<TeamOutlook>(`/teams/${id}/tournament-outlook`),
  matches: (params?: { stage?: string; group?: string; team?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set("stage", params.stage);
    if (params?.group) qs.set("group", params.group);
    if (params?.team) qs.set("team", params.team);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString() ? `?${qs}` : "";
    return get<Match[]>(`/matches${q}`);
  },
  match: (id: string) => get<Match>(`/matches/${id}`),
  prediction: (id: string) => get<MatchPrediction>(`/matches/${id}/prediction`),
  venues: () => get<Venue[]>("/venues"),
  venue: (id: string) => get<Venue>(`/venues/${id}`),
  simulationLatest: () => get<Simulation>("/simulation/latest"),
  bracket: () => get<Record<string, BracketSlot[]>>("/simulation/bracket"),
  multiverseChampions: () => get<ChampionEntry[]>("/multiverse/champions"),
  pivotMatches: () => get<PivotMatch[]>("/multiverse/pivot-matches"),
  universes: (limit = 30) => get<any[]>(`/multiverse/universes?limit=${limit}`),
  calibration: () => get<any>("/validation/calibration"),
  models: () => get<any[]>("/validation/models"),
  counterfactual: (conditions: any[], n_runs = 5000) =>
    post<any>(`/simulation/counterfactual`, { conditions, n_runs }),
};

export function pct(p: number, digits = 1): string {
  return (p * 100).toFixed(digits) + "%";
}
