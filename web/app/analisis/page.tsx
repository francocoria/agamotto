"use client";

import { useEffect, useState } from "react";
import { api, type Team } from "@/lib/api";
import { AnalisisView } from "@/components/AnalisisView";

export default function AnalisisPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.teams().then((t) => {
      setTeams(t ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        ANÁLISIS PROFUNDO · 300+ VARIABLES
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        ANÁLISIS DE ENFRENTAMIENTOS
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Elegí dos equipos para contrastar su historial, estadísticas por mitad, mercados de apuestas
        y predicciones del modelo ensemble.
      </p>

      {loading ? (
        <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)", textAlign: "center" }}>
          <span className="agm-mono" style={{ fontSize: 12 }}>Cargando equipos…</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)" }}>
          <span className="agm-mono" style={{ fontSize: 12 }}>No se pudieron cargar los equipos. Recargá la página.</span>
        </div>
      ) : (
        <AnalisisView teams={teams} />
      )}
    </>
  );
}
