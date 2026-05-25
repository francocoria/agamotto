// Typed API client for Agamotto backend.
//
// IMPORTANT: every fetch uses a short timeout (default 4s) so we never block
// the Vercel build for slow Render cold-starts. Pages that call api.* should
// always `.catch(() => fallback)`.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 4000;

function withTimeout(ms: number): AbortSignal {
  // Fallback for environments without AbortSignal.timeout
  if (typeof AbortSignal !== "undefined" && (AbortSignal as any).timeout) {
    return (AbortSignal as any).timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 30 },
    signal: withTimeout(DEFAULT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // counterfactual can take longer
    signal: withTimeout(15_000),
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
  prediction?: PredictionInline | null;
};

export type Scoreline = { score: string; p: number };
export type Factor = { name: string; value: number; direction: string; weight: number };

export type PredictionInline = {
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

// Helper to read static JSON files (using server-side fs or client-side fetch)
async function readStaticFile(filename: string): Promise<any> {
  if (typeof window === "undefined") {
    try {
      const fs = eval("require")("fs");
      const path = eval("require")("path");
      const filePath = path.join(process.cwd(), "public", "data", filename);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (e) {
      console.warn(`Error reading static file server-side: ${filename}`, e);
    }
  } else {
    try {
      const res = await fetch(`/data/${filename}`, { cache: "force-cache" });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Error fetching static file client-side: ${filename}`, e);
    }
  }
  return null;
}

// Compute rolling averages and H2H statistics in JavaScript
async function computeAnalysisOffline(home: string, away: string, n: number): Promise<any> {
  const recentMatches = await readStaticFile("team-recent-matches.json");
  const teams = await readStaticFile("teams.json");
  if (!recentMatches || !teams) return null;

  const homeTeam = teams.find((t: any) => t.team_id === home.toUpperCase());
  const awayTeam = teams.find((t: any) => t.team_id === away.toUpperCase());
  if (!homeTeam || !awayTeam) return null;

  const homeMatches = recentMatches[home.toUpperCase()] || [];
  const awayMatches = recentMatches[away.toUpperCase()] || [];

  // Filter H2H matches from their histories
  const h2hMatches = homeMatches.filter(
    (m: any) =>
      (m.home === home.toUpperCase() && m.away === away.toUpperCase()) ||
      (m.home === away.toUpperCase() && m.away === home.toUpperCase())
  );

  const h2hHomeWins = h2hMatches.filter(
    (m: any) =>
      (m.home === home.toUpperCase() && m.home_score > m.away_score) ||
      (m.away === home.toUpperCase() && m.away_score > m.home_score)
  ).length;

  const h2hAwayWins = h2hMatches.filter(
    (m: any) =>
      (m.home === away.toUpperCase() && m.home_score > m.away_score) ||
      (m.away === away.toUpperCase() && m.away_score > m.home_score)
  ).length;

  const h2hDraws = h2hMatches.length - h2hHomeWins - h2hAwayWins;

  const getRollingAvg = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return parseFloat((sum / arr.length).toFixed(3));
  };

  const getStats = (matches: any[], team: string) => {
    const subset = matches.slice(0, n);
    const gf: number[] = [];
    const ga: number[] = [];
    const pts: number[] = [];
    const possession: number[] = [];
    const shots: number[] = [];
    const sot: number[] = [];
    const corners: number[] = [];
    const earlyGoals: number[] = [];
    const fouls: number[] = [];
    const yellows: number[] = [];
    const reds: number[] = [];

    subset.forEach((m) => {
      const isHome = m.home === team;
      const side = isHome ? "home" : "away";
      const teamGf = isHome ? m.home_score : m.away_score;
      const teamGa = isHome ? m.away_score : m.home_score;

      gf.push(teamGf);
      ga.push(teamGa);
      pts.push(teamGf > teamGa ? 3 : teamGf === teamGa ? 1 : 0);

      if (m.stats && m.stats[side]) {
        const s = m.stats[side];
        possession.push(s.possession ?? 0.5);
        shots.push(s.shots ?? 0);
        sot.push(s.shots_on_target ?? 0);
        corners.push(s.corners ?? 0);
        earlyGoals.push(s.early_goals_10m ?? 0);
        fouls.push(s.fouls ?? 0);
        yellows.push(s.yellow_cards ?? 0);
        reds.push(s.red_cards ?? 0);
      }
    });

    const totalShots = shots.reduce((a, b) => a + b, 0);
    const totalSot = sot.reduce((a, b) => a + b, 0);
    const totalGf = gf.reduce((a, b) => a + b, 0);

    return {
      form_pts: pts,
      form_pct: pts.length > 0 ? parseFloat((pts.reduce((a, b) => a + b, 0) / (3 * pts.length)).toFixed(3)) : null,
      gf_avg: getRollingAvg(gf),
      ga_avg: getRollingAvg(ga),
      gd_avg: subset.length > 0 ? parseFloat(((gf.reduce((a, b) => a + b, 0) - ga.reduce((a, b) => a + b, 0)) / subset.length).toFixed(3)) : 0,
      possession_avg: getRollingAvg(possession),
      shots_avg: getRollingAvg(shots),
      sot_avg: getRollingAvg(sot),
      corners_avg: getRollingAvg(corners),
      early_goals_avg: getRollingAvg(earlyGoals),
      fouls_avg: getRollingAvg(fouls),
      yellows_avg: getRollingAvg(yellows),
      reds_avg: getRollingAvg(reds),
      shot_efficiency: totalShots > 0 ? parseFloat((totalSot / totalShots).toFixed(3)) : null,
      conversion_rate: totalSot > 0 ? parseFloat((totalGf / totalSot).toFixed(3)) : null,
      matches_analyzed: subset.length,
    };
  };

  const getRecentFormResults = (matches: any[], team: string) => {
    return matches.slice(0, 5).map((m) => {
      const isHome = m.home === team;
      const gf = isHome ? m.home_score : m.away_score;
      const ga = isHome ? m.away_score : m.home_score;
      return gf > ga ? "W" : gf === ga ? "D" : "L";
    }).reverse();
  };

  const getRecentMatchesDetail = (matches: any[], team: string) => {
    return matches.slice(0, 5).map((m) => {
      const isHome = m.home === team;
      const gf = isHome ? m.home_score : m.away_score;
      const ga = isHome ? m.away_score : m.home_score;
      const opp = isHome ? m.away : m.home;
      return {
        date: m.date,
        opponent: opp,
        score: `${gf}–${ga}`,
        result: gf > ga ? "W" : gf === ga ? "D" : "L",
        tournament: m.tournament,
        is_home: isHome,
      };
    }).reverse();
  };

  return {
    home: {
      team_id: home.toUpperCase(),
      name: homeTeam.name,
      flag: homeTeam.flag_emoji,
      elo: homeTeam.elo,
      fifa_rank: homeTeam.fifa_rank,
      confederation: homeTeam.confederation,
      recent_form: getRecentFormResults(homeMatches, home.toUpperCase()),
      recent_matches: getRecentMatchesDetail(homeMatches, home.toUpperCase()),
      stats: getStats(homeMatches, home.toUpperCase()),
    },
    away: {
      team_id: away.toUpperCase(),
      name: awayTeam.name,
      flag: awayTeam.flag_emoji,
      elo: awayTeam.elo,
      fifa_rank: awayTeam.fifa_rank,
      confederation: awayTeam.confederation,
      recent_form: getRecentFormResults(awayMatches, away.toUpperCase()),
      recent_matches: getRecentMatchesDetail(awayMatches, away.toUpperCase()),
      stats: getStats(awayMatches, away.toUpperCase()),
    },
    h2h: {
      total_matches: h2hMatches.length,
      home_wins: h2hHomeWins,
      away_wins: h2hAwayWins,
      draws: h2hDraws,
      recent: h2hMatches.slice(0, 8).map((m: any) => ({
        date: m.date,
        home: m.home,
        away: m.away,
        score: `${m.home_score}–${m.away_score}`,
        tournament: m.tournament,
      })).reverse(),
    },
    n_matches: n,
  };
}

export const api = {
  teams: async (): Promise<Team[]> => (await readStaticFile("teams.json")) || get<Team[]>("/teams"),
  team: async (id: string): Promise<Team> => {
    const teams = await readStaticFile("teams.json");
    if (teams) {
      const t = teams.find((x: any) => x.team_id === id.toUpperCase());
      if (t) return t;
    }
    return get<Team>(`/teams/${id}`);
  },
  teamOutlook: async (id: string): Promise<TeamOutlook> => {
    const sim = await readStaticFile("simulation-latest.json");
    if (sim && sim.team_outlook) {
      const o = sim.team_outlook[id.toUpperCase()];
      if (o) return { team_id: id.toUpperCase(), name: o.name, ...o } as TeamOutlook;
    }
    return get<TeamOutlook>(`/teams/${id}/tournament-outlook`);
  },
  matches: async (params?: { stage?: string; group?: string; team?: string; limit?: number }): Promise<Match[]> => {
    const allMatches = await readStaticFile("matches.json");
    if (allMatches) {
      let list = allMatches;
      if (params?.stage) list = list.filter((m: any) => m.stage === params.stage);
      if (params?.group) list = list.filter((m: any) => m.group_label === params.group);
      if (params?.team) {
        const t = params.team.toUpperCase();
        list = list.filter((m: any) => m.home_team?.team_id === t || m.away_team?.team_id === t);
      }
      if (params?.limit) list = list.slice(0, params.limit);
      return list;
    }
    const qs = new URLSearchParams();
    if (params?.stage) qs.set("stage", params.stage);
    if (params?.group) qs.set("group", params.group);
    if (params?.team) qs.set("team", params.team);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString() ? `?${qs}` : "";
    return get<Match[]>(`/matches${q}`);
  },
  match: async (id: string): Promise<Match> => {
    const allMatches = await readStaticFile("matches.json");
    if (allMatches) {
      const m = allMatches.find((x: any) => x.match_id === id);
      if (m) return m;
    }
    return get<Match>(`/matches/${id}`);
  },
  prediction: async (id: string): Promise<MatchPrediction> => {
    const allMatches = await readStaticFile("matches.json");
    if (allMatches) {
      const m = allMatches.find((x: any) => x.match_id === id);
      if (m && m.prediction) {
        return {
          match_id: id,
          model_version: m.prediction.model_version || "ensemble",
          as_of: new Date().toISOString(),
          home_team: m.home_team,
          away_team: m.away_team,
          venue: m.venue,
          ...m.prediction,
        } as MatchPrediction;
      }
    }
    return get<MatchPrediction>(`/matches/${id}/prediction`);
  },
  predictCustom: async (home: string, away: string, neutral = true): Promise<MatchPrediction> => {
    if (neutral) {
      try {
        const cache = await readStaticFile("predictions.json");
        if (cache) {
          const key = home.toUpperCase() < away.toUpperCase()
            ? `${home.toUpperCase()}__${away.toUpperCase()}`
            : `${away.toUpperCase()}__${home.toUpperCase()}`;
          const pair = cache.pairs[key];
          if (pair) {
            const flipped = pair.first !== home.toUpperCase();
            return {
              match_id: `CACHE_${home}_${away}`,
              model_version: cache.model_version,
              as_of: new Date().toISOString(),
              home_team: cache.teams[home.toUpperCase()],
              away_team: cache.teams[away.toUpperCase()],
              venue: null,
              p_home: flipped ? pair.p_second : pair.p_first,
              p_draw: pair.p_draw,
              p_away: flipped ? pair.p_first : pair.p_second,
              lambda_home: flipped ? pair.lambda_second : pair.lambda_first,
              lambda_away: flipped ? pair.lambda_first : pair.lambda_second,
              p_over_2_5: pair.p_over_2_5,
              p_btts: pair.p_btts,
              top_scorelines: flipped
                ? pair.top_scorelines.map((s: any) => {
                    const [x, y] = s.score.split("-");
                    return { score: `${y}-${x}`, p: s.p };
                  })
                : pair.top_scorelines,
              top_factors: pair.top_factors,
            } as MatchPrediction;
          }
        }
      } catch (e) {
        // ignore and fallback
      }
    }
    return get<MatchPrediction>(`/predict?home=${home}&away=${away}&neutral=${neutral}`);
  },
  analyze: async (home: string, away: string, n = 10): Promise<any> => {
    try {
      const data = await computeAnalysisOffline(home, away, n);
      if (data) return data;
    } catch (e) {
      // fallback
    }
    return get<any>(`/analyze?home=${home}&away=${away}&n=${n}`);
  },
  venues: async (): Promise<Venue[]> => (await readStaticFile("venues.json")) || get<Venue[]>("/venues"),
  venue: async (id: string): Promise<Venue> => {
    const list = await readStaticFile("venues.json");
    if (list) {
      const v = list.find((x: any) => x.venue_id === id);
      if (v) return v;
    }
    return get<Venue>(`/venues/${id}`);
  },
  simulationLatest: async (): Promise<Simulation> => (await readStaticFile("simulation-latest.json")) || get<Simulation>("/simulation/latest"),
  bracket: async (): Promise<Record<string, BracketSlot[]>> => (await readStaticFile("bracket.json")) || get<Record<string, BracketSlot[]>>("/simulation/bracket"),
  multiverseChampions: async (): Promise<ChampionEntry[]> => (await readStaticFile("multiverse-champions.json")) || get<ChampionEntry[]>("/multiverse/champions"),
  pivotMatches: async (): Promise<PivotMatch[]> => (await readStaticFile("pivot-matches.json")) || get<PivotMatch[]>("/multiverse/pivot-matches"),
  universes: async (limit = 30): Promise<any[]> => {
    const sim = await readStaticFile("simulation-latest.json");
    if (sim && sim.sampled_universes) {
      return sim.sampled_universes.slice(0, limit);
    }
    return get<any[]>(`/multiverse/universes?limit=${limit}`);
  },
  calibration: async (): Promise<any> => (await readStaticFile("calibration.json")) || get<any>("/validation/calibration"),
  baselines: async (): Promise<any> => (await readStaticFile("baselines.json")) || get<any>("/validation/baselines"),
  models: async (): Promise<any[]> => (await readStaticFile("models.json")) || get<any[]>("/validation/models"),
  counterfactual: (conditions: any[], n_runs = 5000): Promise<any> =>
    post<any>(`/simulation/counterfactual`, { conditions, n_runs }),
};

export function pct(p: number, digits = 1): string {
  return (p * 100).toFixed(digits) + "%";
}
