"""Pre-computa la predicción del ensemble para TODAS las combinaciones de equipos.

Output: web/public/data/predictions.json — JSON estático servido por Vercel.
La frontend consulta este archivo localmente y NO hace request a la API por cada
pareja, reduciendo carga del backend y dando respuestas instantáneas.

48 equipos × 47 oponentes / 2 (simétrico en neutral) = 1128 pares únicos.
Tamaño esperado: ~3 MB.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import Team
from agamotto.models import ensemble

log = get_logger(__name__)


def _pair_key(a: str, b: str) -> str:
    """Clave simétrica para pares en cancha neutral."""
    return f"{a}__{b}" if a < b else f"{b}__{a}"


def compute_all(out_path: Path | None = None, max_scorelines: int = 20) -> dict:
    """Computa predicción ensemble para cada par posible (cancha neutral).
    Devuelve un dict { 'TEAM_A__TEAM_B': prediction_dict } más metadata.
    """
    ens = ensemble.build()
    with get_session() as s:
        teams = s.execute(select(Team.team_id, Team.name, Team.fifa_code, Team.flag_emoji, Team.elo, Team.confederation)).all()
    team_ids = sorted(set(t[0] for t in teams))
    teams_meta = {t[0]: {"team_id": t[0], "name": t[1], "fifa_code": t[2],
                        "flag_emoji": t[3], "elo": t[4], "confederation": t[5]}
                  for t in teams}

    pairs = {}
    n = len(team_ids)
    log.info("Pre-computing %d unique pairs across %d teams...", n * (n - 1) // 2, n)
    for i, a in enumerate(team_ids):
        for b in team_ids[i + 1:]:
            out = ens.predict(a, b, neutral=True)
            key = _pair_key(a, b)
            # Si la clave es B__A (b < a), pero predict() asume a=local y b=visita,
            # por simetría en cancha neutral, cambiar p_home/p_away si invertimos
            # En realidad: como neutral, p_home cuando a juega de local debería ser
            # similar a p_away cuando b juega de local. Guardamos siempre por orden
            # alfabético y registramos quién es 'first'/'second'.
            first, second = (a, b) if a < b else (b, a)
            # Ajustar: si first != a (i.e. b<a), invertimos
            if first == a:
                p_first, p_second = out["p_home"], out["p_away"]
                lam_first, lam_second = out["lambda_home"], out["lambda_away"]
                scorelines = out["top_scorelines"][:max_scorelines]
            else:
                p_first, p_second = out["p_away"], out["p_home"]
                lam_first, lam_second = out["lambda_away"], out["lambda_home"]
                # Invertir scorelines también
                scorelines = []
                for sc in out["top_scorelines"][:max_scorelines]:
                    h, a2 = sc["score"].split("-")
                    scorelines.append({"score": f"{a2}-{h}", "p": sc["p"]})

            pairs[key] = {
                "first": first, "second": second,
                "p_first": round(p_first, 4),
                "p_draw": round(out["p_draw"], 4),
                "p_second": round(p_second, 4),
                "lambda_first": round(lam_first, 3),
                "lambda_second": round(lam_second, 3),
                "p_over_2_5": round(out["p_over_2_5"], 4),
                "p_btts": round(out["p_btts"], 4),
                "top_scorelines": scorelines,
                "top_factors": out["top_factors"][:5],
            }
        if (i + 1) % 10 == 0:
            log.info("  %d/%d teams processed", i + 1, n)

    out_data = {
        "model_version": ens.version,
        "n_pairs": len(pairs),
        "n_teams": n,
        "teams": teams_meta,
        "pairs": pairs,
    }

    out_path = out_path or (settings.repo_root / "web" / "public" / "data" / "predictions.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = out_path.stat().st_size / 1024
    log.info("Wrote %d pairs → %s (%.1f KB)", len(pairs), out_path, size_kb)
    return out_data
