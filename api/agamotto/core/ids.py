"""Canonical IDs for entities. Stable across providers."""

import re
import unicodedata


def _slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").upper()
    return s


def team_id(country_or_name: str) -> str:
    return _slug(country_or_name)


def venue_id(stadium: str, city: str = "") -> str:
    base = _slug(stadium)
    if city:
        base = f"{base}__{_slug(city)}"
    return base


def player_id(name: str, dob: str | None = None) -> str:
    base = _slug(name)
    if dob:
        base = f"{base}__{dob.replace('-', '')}"
    return base


def match_id(tournament: str, stage: str, code: str) -> str:
    return f"{_slug(tournament)}_{_slug(stage)}_{_slug(code)}"


def referee_id(name: str, country: str = "") -> str:
    base = _slug(name)
    if country:
        base = f"{base}__{_slug(country)}"
    return base
