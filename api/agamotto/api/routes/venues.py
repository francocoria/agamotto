from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.api.schemas import VenueOut
from agamotto.db.models import Venue

router = APIRouter(prefix="/venues", tags=["venues"])


def _venue_out(v: Venue) -> VenueOut:
    return VenueOut(
        venue_id=v.venue_id, name=v.name, city=v.city, country=v.country,
        altitude_m=v.altitude_m, capacity=v.capacity, surface=v.surface,
        roof=v.roof, timezone=v.timezone, latitude=v.latitude, longitude=v.longitude,
    )


@router.get("", response_model=list[VenueOut])
def list_venues(s: Session = Depends(db)):
    rows = s.execute(select(Venue).order_by(Venue.name)).scalars().all()
    return [_venue_out(v) for v in rows]


@router.get("/{venue_id}", response_model=VenueOut)
def get_venue(venue_id: str, s: Session = Depends(db)):
    v = s.get(Venue, venue_id)
    if not v:
        raise HTTPException(404, "Venue not found")
    return _venue_out(v)
