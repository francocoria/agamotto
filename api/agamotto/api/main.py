from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agamotto import __version__
from agamotto.api.routes import matches, multiverse, players, predict, simulation, teams, validation, venues, analyze
from agamotto.core.config import settings
from agamotto.core.db import init_engine


def create_app() -> FastAPI:
    init_engine()
    app = FastAPI(
        title="Agamotto API",
        version=__version__,
        description="Plataforma predictiva multiverso del Mundial FIFA 2026.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {
            "service": "agamotto",
            "version": __version__,
            "tagline": "No vemos un futuro. Los vemos todos.",
            "endpoints": [
                "/matches", "/teams", "/players", "/venues",
                "/simulation/latest", "/simulation/counterfactual",
                "/multiverse/champions", "/multiverse/pivot-matches", "/multiverse/universes",
                "/validation/calibration", "/validation/models",
            ],
        }

    app.include_router(teams.router)
    app.include_router(matches.router)
    app.include_router(venues.router)
    app.include_router(players.router)
    app.include_router(simulation.router)
    app.include_router(multiverse.router)
    app.include_router(validation.router)
    app.include_router(predict.router)
    app.include_router(analyze.router)

    return app


app = create_app()
