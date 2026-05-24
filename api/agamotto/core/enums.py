from enum import StrEnum


class Confederation(StrEnum):
    CONMEBOL = "CONMEBOL"
    UEFA = "UEFA"
    AFC = "AFC"
    CAF = "CAF"
    CONCACAF = "CONCACAF"
    OFC = "OFC"


class Stage(StrEnum):
    GROUP = "group"
    ROUND_32 = "round_32"
    ROUND_16 = "round_16"
    QUARTER = "quarter"
    SEMI = "semi"
    THIRD = "third_place"
    FINAL = "final"


class Position(StrEnum):
    GK = "GK"
    DF = "DF"
    MF = "MF"
    FW = "FW"


class SquadStatus(StrEnum):
    PROVISIONAL = "provisional"
    ANNOUNCED = "announced"
    OFFICIAL = "official"
    REPLACEMENT = "replacement"


class Availability(StrEnum):
    AVAILABLE = "available"
    DOUBT = "doubt"
    INJURED = "injured"
    SUSPENDED = "suspended"
    OUT = "out"


class LineupKind(StrEnum):
    PROBABLE = "probable"
    OFFICIAL = "official"


class MatchStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"
