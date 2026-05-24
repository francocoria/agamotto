"""Bracket configuration para el formato 48 equipos del Mundial 2026.

12 grupos (A-L) × 4 equipos = 48
Pasan a 32avos: 12 winners + 12 runners-up + 8 best thirds = 32
32avos → octavos → cuartos → semis → final
"""

from __future__ import annotations

GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]

# Asignación simplificada de mejores terceros: 8 de 12 grupos pasan.
# La FIFA tiene tablas oficiales; aquí usamos un mapeo basado en los 8
# grupos con mejor desempeño relativo, asignados a slots fijos del bracket.
BEST_THIRDS_SLOTS = ["A", "B", "C", "D", "E", "F", "G", "H"]

# Mapeo de cruces de 32avos. Usa labels:
#   "W_X" = winner del grupo X
#   "R_X" = runner-up del grupo X
#   "T_X" = best third asignado al slot X
# Bracket simplificado y simétrico (12 grupos no es simétrico perfecto;
# usamos esta estructura como template — el usuario puede ajustar).
ROUND_32_PAIRS: list[tuple[str, str]] = [
    ("W_A", "R_F"),
    ("W_C", "T_A"),
    ("W_E", "R_K"),
    ("W_G", "T_E"),
    ("W_I", "R_A"),
    ("W_K", "T_C"),
    ("R_B", "R_G"),
    ("T_G", "R_E"),
    ("W_B", "T_B"),
    ("W_D", "R_J"),
    ("W_F", "T_F"),
    ("W_H", "R_C"),
    ("W_J", "T_D"),
    ("W_L", "T_H"),
    ("R_D", "R_H"),
    ("R_I", "R_L"),
]

# Cada match index en R32 indica quién avanza a qué match en R16.
# 16 matches en R32 → 8 en R16. Pareo: (0,1), (2,3), ..., (14,15).
ROUND_16_PAIRS_FROM_R32 = [(2 * i, 2 * i + 1) for i in range(8)]
QUARTER_PAIRS_FROM_R16 = [(2 * i, 2 * i + 1) for i in range(4)]
SEMI_PAIRS_FROM_QF = [(2 * i, 2 * i + 1) for i in range(2)]
FINAL_PAIR_FROM_SF = (0, 1)


def expected_round_match_counts() -> dict[str, int]:
    return {
        "group": 12 * 6,
        "round_32": 16,
        "round_16": 8,
        "quarter": 4,
        "semi": 2,
        "third_place": 1,
        "final": 1,
    }
