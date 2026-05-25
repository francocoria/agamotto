// Carga el snapshot estático de predicciones (servido por Vercel desde /data/predictions.json)
// y expone un API local para consultar pares sin pegarle al backend.

export type CachedScoreline = { score: string; p: number };
export type CachedFactor = { name: string; value: number; direction: string; weight: number };

export type CachedPair = {
  first: string;
  second: string;
  p_first: number;
  p_draw: number;
  p_second: number;
  lambda_first: number;
  lambda_second: number;
  p_over_2_5: number;
  p_btts: number;
  top_scorelines: CachedScoreline[];
  top_factors: CachedFactor[];
};

export type CachedTeam = {
  team_id: string;
  name: string;
  fifa_code?: string | null;
  flag_emoji?: string | null;
  elo?: number | null;
  confederation?: string | null;
};

export type PredictionsCache = {
  model_version: string;
  n_pairs: number;
  n_teams: number;
  teams: Record<string, CachedTeam>;
  pairs: Record<string, CachedPair>;
};

let _cache: PredictionsCache | null = null;
let _loadingPromise: Promise<PredictionsCache> | null = null;

export async function loadPredictionsCache(): Promise<PredictionsCache> {
  if (_cache) return _cache;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch("/data/predictions.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("predictions cache not available");
      return r.json();
    })
    .then((data: PredictionsCache) => {
      _cache = data;
      return data;
    });
  return _loadingPromise;
}

// Asimétrico: input home/away → devuelve los probs orientados según home/away.
export function lookupPair(
  cache: PredictionsCache,
  home: string,
  away: string,
): {
  home_team?: CachedTeam;
  away_team?: CachedTeam;
  p_home: number;
  p_draw: number;
  p_away: number;
  lambda_home: number;
  lambda_away: number;
  p_over_2_5: number;
  p_btts: number;
  top_scorelines: CachedScoreline[];
  top_factors: CachedFactor[];
  model_version: string;
} | null {
  const h = home.toUpperCase();
  const a = away.toUpperCase();
  if (h === a) return null;
  const key = h < a ? `${h}__${a}` : `${a}__${h}`;
  const pair = cache.pairs[key];
  if (!pair) return null;
  // pair stored from pair.first perspective. Check orientation.
  const flipped = pair.first !== h;
  const ht = cache.teams[h];
  const at = cache.teams[a];
  if (!flipped) {
    return {
      home_team: ht, away_team: at,
      p_home: pair.p_first, p_draw: pair.p_draw, p_away: pair.p_second,
      lambda_home: pair.lambda_first, lambda_away: pair.lambda_second,
      p_over_2_5: pair.p_over_2_5, p_btts: pair.p_btts,
      top_scorelines: pair.top_scorelines,
      top_factors: pair.top_factors,
      model_version: cache.model_version,
    };
  }
  // Flip
  return {
    home_team: ht, away_team: at,
    p_home: pair.p_second, p_draw: pair.p_draw, p_away: pair.p_first,
    lambda_home: pair.lambda_second, lambda_away: pair.lambda_first,
    p_over_2_5: pair.p_over_2_5, p_btts: pair.p_btts,
    top_scorelines: pair.top_scorelines.map((s) => {
      const [x, y] = s.score.split("-");
      return { score: `${y}-${x}`, p: s.p };
    }),
    top_factors: pair.top_factors,
    model_version: cache.model_version,
  };
}
