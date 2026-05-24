# AGAMOTTO

**Plataforma predictiva multiverso del Mundial FIFA 2026**

> *"No vemos un futuro. Los vemos todos."*

Predicción probabilística calibrada de los 104 partidos, los 48 planteles, los ~1.248 jugadores y las miles de millones de líneas de tiempo posibles del torneo. App web interactiva que permite "abrir el Ojo" y recorrer todas las realidades plausibles del Mundial: fijar resultados, eliminar a un jugador, mover a un equipo de sede, y ver cómo se reescribe el bracket entero.

| Campo | Valor |
|---|---|
| **Nombre del proyecto** | Agamotto |
| **Versión del plan** | 1.0 — documento base de implementación |
| **Alcance** | 48 selecciones, 104 partidos, 16 sedes, planteles oficiales, simulador completo de torneo, vista multiverso |
| **Objetivo de producto** | App web funcional que muestra todas las realidades posibles del Mundial 2026 |
| **Objetivo académico** | Tesis defendible: modelo probabilístico calibrado, reproducible y comparado contra baselines fuertes |
| **Principio rector** | Probabilidades calibradas, no certezas. Ningún resultado es único, todos son posibles con un peso |

---

## Tabla de contenido

### Parte I — Visión y producto
1. Resumen ejecutivo y el Ojo de Agamotto
2. Alcance funcional y preguntas que responde la app
3. Estado del Mundial 2026 y supuestos de diseño
4. Diferenciales del producto

### Parte II — Datos
5. Fuentes, APIs y decisión recomendada
6. Estrategia, gobierno y versionado de datos
7. Catálogo completo de variables

### Parte III — Modelado
8. Arquitectura de modelos por capas
9. Modelo de goles (Poisson / Dixon-Coles / Bayesiano jerárquico)
10. ML tabular y ensemble
11. Player Impact Model y contrafactuales
12. Calibración, validación académica y prevención de leakage

### Parte IV — Simulador multiverso
13. Monte Carlo del torneo completo
14. El Ojo de Agamotto: navegación de líneas de tiempo
15. Contrafactuales encadenados

### Parte V — Arquitectura técnica
16. Stack tecnológico
17. Modelo de datos
18. API interna y contratos
19. App web: pantallas, UX y visualizaciones

### Parte VI — Implementación
20. Roadmap por fases (sin fechas fijas)
21. Backlog técnico inicial
22. Costos, alternativas y criterios de compra
23. Riesgos, limitaciones y mitigaciones
24. Estructura sugerida para la tesis
25. Próximos pasos
26. Anexos: ejemplos JSON, esquema SQL, esqueleto de repo, referencias

---

# Parte I — Visión y producto

## 1. Resumen ejecutivo y el Ojo de Agamotto

Agamotto es una plataforma probabilística para todo el Mundial FIFA 2026. No predice "el resultado": predice **todas las realidades posibles** con su peso, las hace navegables y las recalcula en tiempo real cuando cambia cualquier supuesto (un jugador se lesiona, una sede cambia el clima, un grupo se define de otra manera).

El motor combina:

- Datos oficiales de FIFA como verdad de torneo y plantel.
- APIs deportivas estructuradas (lineups, eventos, lesiones, odds).
- Históricos abiertos para fuerza de selecciones (MartJ42, OpenFootball, World Football Elo).
- Datos de eventos para metodología (StatsBomb Open Data).
- Un feature store versionado.
- Modelos estadísticos de goles + ML tabular + modelo de impacto de jugadores.
- Un simulador Monte Carlo de 100k+ torneos por corrida.
- Una capa de calibración que asegura honestidad probabilística.

### 1.1 La metáfora: Ojo de Agamotto

El **Ojo de Agamotto** es la vista central del producto. Es una interfaz que muestra:

- **Líneas de tiempo paralelas** del torneo, agrupadas por escenario representativo.
- **Densidad de cada línea**: qué tan probable es esa rama del multiverso.
- **Puntos de bifurcación**: partidos donde una pequeña diferencia abre dos universos muy distintos.
- **Manipulación de la realidad**: el usuario fija un resultado o cambia un lineup y el Ojo "colapsa" hacia el subconjunto de universos compatibles, recalculando todo lo demás en vivo.

Cada partido, cada plantel, cada jugador, cada sede, cada minuto contribuye a un universo concreto. El usuario navega ese espacio.

### 1.2 Output esperado (resumen)

- 1X2 por partido con incertidumbre.
- Distribución completa de marcadores exactos.
- Goles esperados por equipo (lambda).
- Probabilidades de avance por fase: grupo → 32avos → octavos → cuartos → semi → final → campeón.
- Probabilidades condicionadas: "dado que X gana su grupo, ¿qué pasa?".
- Impacto de jugadores: delta probabilidad si entra/sale/se lesiona.
- Rutas más probables al título por equipo.
- Universos extremos: ¿cuál es el campeón más improbable que aún tiene chance > 0.1%?
- Panel académico: calibración, Brier, Log Loss, feature importance, comparación con baselines.

### 1.3 Lo que Agamotto NO es

- No es una recomendación de apuestas.
- No predice resultados exactos como certeza.
- No es un modelo de seguimiento minuto a minuto (a menos que se contrate una API live profesional en fase 4).
- No es un scraping agresivo de sitios que lo prohíban.

---

## 2. Alcance funcional y preguntas que responde la app

Agamotto cubre las 48 selecciones, los 104 partidos oficiales, las 16 sedes, los planteles finales cuando FIFA los publique, y los jugadores con datos disponibles a nivel de club o selección.

Mientras los planteles no estén cerrados, el sistema trabaja con listas preliminares, convocatorias recientes y probabilidades de inclusión por jugador.

### 2.1 Preguntas del usuario final

| Pregunta | Respuesta de Agamotto |
|---|---|
| ¿Quién tiene más probabilidad de ganar este partido? | Probabilidad 1X2 con intervalo de incertidumbre y timestamp del modelo. |
| ¿Cuál es el marcador más probable? | Top-N de marcadores exactos y heatmap completo de scorelines. |
| ¿Qué cambia si no juega una figura? | Delta de p_win, lambda y probabilidad de clasificar, con explicación de qué se mueve. |
| ¿Qué equipos tienen más chances de salir campeones? | Ranking global de p_champion con ruta modal al título. |
| ¿Qué pasa si fijo un resultado o varios? | Recálculo de grupo, mejores terceros, bracket y probabilidades del resto del torneo. |
| ¿Por qué el modelo favorece a un equipo? | Top features que empujan la predicción, en lenguaje natural. |
| ¿Cuán confiable es la predicción? | Calibración histórica, Brier, Log Loss y comparación contra baselines. |
| ¿Cuál es la línea de tiempo más "loca" pero todavía posible? | Universo improbable destacado con su probabilidad real. |
| ¿En qué partidos se decide más el torneo? | Partidos con mayor "impacto sistémico": cuánto cambia el resto del bracket según su resultado. |
| ¿Qué jugador mueve más la aguja del Mundial? | Player Impact Score agregado a nivel torneo, no solo partido. |

### 2.2 Fuera del MVP

- Tracking posicional en vivo y eventos minuto a minuto.
- Garantía de resultado exacto.
- Scraping de sitios sin licencia.
- Recomendación de apuestas (las odds entran como benchmark, nunca como consejo).
- Predicción de torneos distintos del Mundial 2026 (extensible, pero fuera del MVP).

---

## 3. Estado del Mundial 2026 y supuestos de diseño

El Mundial 2026 se juega con **48 selecciones**, **12 grupos de 4**, **104 partidos** y una **ronda extra de 32avos** antes de octavos. Se disputa en Canadá, México y Estados Unidos, en 16 sedes.

FIFA mantiene páginas oficiales de calendario, fixtures, sedes, grupos, equipos, rankings y resultados. Esas páginas son fuente de verdad para estructura del torneo. Planteles: cada selección puede convocar 26 jugadores.

### 3.1 Implicancias técnicas del formato 48 equipos

- Predicción aislada no alcanza: el sistema debe **simular** tablas, desempates, mejores terceros y cruces.
- Fase de grupos = 72 partidos. Enumeración bruta de 3^72 escenarios es intratable. Monte Carlo obligatorio.
- 32avos depende de mejores terceros: la lógica de cruces debe ser **configuración basada en reglamento**, no reglas hardcodeadas.
- Sedes en 3 países introducen **clima, altitud, husos horarios y distancia de viaje** como features de partido.

### 3.2 Supuestos operativos

| Supuesto | Tratamiento |
|---|---|
| Planteles aún no congelados | Versionar: provisional → anunciado por federación → validado por FIFA → reemplazo por lesión. |
| Datos de selección escasos por jugador | Combinar selección + club + rating por liga + priors por posición/edad. |
| Cambios de última hora | Recálculo automático ante cambios de lineup, lesión o sede. |
| APIs cambian precio o cobertura | Abstracción por adapter y persistencia de payloads raw. |
| Modelo puede estar mal calibrado | Calibración isotónica, backtesting temporal y monitoreo de drift. |
| Sedes con clima muy diferente | Variables de clima como features y enriquecimiento por sede. |

---

## 4. Diferenciales del producto

Lo que separa a Agamotto de un "predictor de Mundial" cualquiera:

1. **Cobertura completa**: los 104 partidos, no solo los importantes.
2. **Vista multiverso navegable**, no solo una predicción puntual.
3. **Contrafactuales encadenados**: el usuario puede componer "si pasa X y además Y".
4. **Impacto de jugadores agregado a nivel torneo**, no solo partido.
5. **Sedes, clima, viaje y árbitros** modelados explícitamente.
6. **Transparencia académica**: cada predicción muestra modelo, versión, features y calibración.
7. **Reproducibilidad total**: payloads raw + features + modelo versionados.

---

# Parte II — Datos

## 5. Fuentes, APIs y decisión recomendada

Ninguna fuente cubre todo. La estrategia es **pipeline multi-provider con jerarquía de confianza** y adapters intercambiables.

### 5.1 Catálogo de fuentes

| Fuente | Costo | Datos clave | Uso | Riesgo / nota |
|---|---|---|---|---|
| FIFA.com | Gratis / oficial | Formato, fixtures, grupos, sedes, equipos, planteles finales. | Fuente de verdad estructural. | Sin API pública estable; ingestion controlada y validación manual. |
| Statorium World Cup API | Pago one-time (USD 177 / 499) | Fixtures, standings, jugadores, eventos, lineups, odds. | MVP específico del Mundial. | Validar licencia, SLA, latencia. |
| API-Football / API-Sports | Freemium / pago | Fixtures, lineups, jugadores, lesiones, odds, múltiples competiciones. | Provider general, ligas + selecciones. | Free limitado a 100 req/día. |
| football-data.org | Gratis / pago | Fixtures, resultados, tablas. | Prototipo y backfills. | Sin profundidad de jugador. |
| Sportmonks | Trial / pago | World Cup API con odds y predicciones propias. | Alternativa profesional intermedia. | Revisar costo real. |
| StatsBomb Open Data | Gratis parcial | Eventos JSON, lineups, StatsBomb 360. | Metodología académica de eventos / xG. | No cubre todo en vivo. |
| SportsDataIO | Comercial | World Cup API real-time + histórico. | Alternativa profesional. | Contrato comercial. |
| TheStatsAPI | Trial / pago | Match data, player stats, xG, 80+ competiciones. | Ratings recientes de jugadores. | Confirmar cobertura. |
| Opta / Stats Perform | Enterprise | Datos avanzados, tracking, computer vision. | Versión profesional avanzada. | Costo alto. |
| OpenFootball | Gratis / CC0 | Datasets abiertos de Mundiales en JSON. | Backfill y validación. | No reemplaza API live. |
| MartJ42 / Kaggle internationals | Gratis | Histórico internacional desde 1872. | Entrenar Elo y baselines históricas. | Requiere limpieza y normalización. |
| World Football Elo | Gratis web | Ratings Elo de selecciones. | Benchmark externo. | Sin API estable; snapshots. |
| OpenWeatherMap / Open-Meteo | Gratis / freemium | Clima histórico y pronosticado por sede. | Feature de clima por partido. | Validar histórico a 30+ días. |
| GeoNames / Wikipedia (estadios) | Gratis | Altitud, capacidad, dimensiones de cancha, ciudad. | Enriquecimiento de sedes. | Validar consistencia. |
| Transfermarkt (público) | Gratis web | Valor de mercado, lesiones, convocatorias. | Cruce de identidad y valor de plantel. | Términos de uso; preferir API oficial cuando exista. |

### 5.2 Decisión por presupuesto

| Escenario | Stack | Costo orientativo | Comentario |
|---|---|---|---|
| Modo tesis económico | FIFA + OpenFootball + MartJ42 + StatsBomb Open + API-Football Free + Open-Meteo | USD 0–30 / mes | MVP funcional con límites en jugadores/live. |
| **Modo intermedio recomendado** | FIFA + Statorium Premium + API-Football Pro o Sportmonks + StatsBomb Open + Open-Meteo | **USD 499 one-time + USD 19+/mes** | Balance costo / cobertura / app presentable. |
| Modo profesional | FIFA + Opta o SportsDataIO + provider de odds dedicado | Contrato comercial | Excede una tesis típica. |

**Recomendación de arranque**: modo intermedio con adapters listos para escalar.

---

## 6. Estrategia, gobierno y versionado de datos

La calidad del modelo va a depender más del versionado de datos que del algoritmo. Cada predicción tiene que poder reproducirse: bisecar features, modelo y payloads.

### 6.1 Jerarquía de fuentes

1. **Oficial**: FIFA para torneo y planteles.
2. **Provider estructurado**: API contratada para lineups, eventos, lesiones, odds.
3. **Históricos abiertos**: MartJ42, OpenFootball, StatsBomb Open, World Football Elo.
4. **Enriquecimiento**: ranking FIFA, clima, distancia, huso horario, club, edad, posición, sede.
5. **Manual controlado**: correcciones de identidad cuando hay conflictos.

### 6.2 Cadencia de ingesta

| Período | Frecuencia | Datos |
|---|---|---|
| Hasta listas finales | 1× por día | Fixtures, rankings, convocatorias, lesiones, rendimiento club, odds, histórico. |
| Semana de publicación de planteles | 2–4× por día | Planteles, bajas, cambios de estado, noticias, odds. |
| Día previo a partido | Cada 60 min | Lesiones, odds, lineups probables, **clima pronosticado**. |
| Día de partido | Cada 30 min | Lineups, clima observado, estado de sede. |
| Lineup oficial publicado | Inmediato | Titulares y suplentes oficiales; recálculo de partido y torneo. |
| Post partido | Inmediato + batch nocturno | Resultado, eventos, stats, minutos, tarjetas, lesiones, nuevos ratings. |

### 6.3 Principios de gobierno

- **Raw payloads persistidos** por provider y timestamp.
- Cada registro lleva `source`, `source_timestamp`, `ingestion_timestamp`, `provider_version`.
- **IDs canónicos internos** para equipo, jugador, estadio, partido, torneo, árbitro.
- Tabla de **identity resolution** que mapea IDs entre APIs.
- Planteles versionados, nunca sobrescritos.
- Features y modelos versionados (model registry + feature store).
- Separación explícita entre **observado, inferido y estimado** (ej. lineup oficial vs lineup probable).
- **Lock temporal de features**: ninguna feature puede usar información posterior al kickoff del partido predicho (anti-leakage estricto).

---

## 7. Catálogo completo de variables

Cada variable lleva: hipótesis, fuente, ventana temporal, tratamiento de faltantes y prioridad. El feature store soporta **ablation tests** para medir aporte incremental.

### 7.1 Variables de país y selección

| Variable | Descripción | Fuente | Prioridad |
|---|---|---|---|
| Confederación | CONMEBOL, UEFA, AFC, CAF, CONCACAF, OFC. | FIFA | Media |
| Ranking FIFA | Ranking oficial actual y serie temporal. | FIFA | Alta |
| Elo propio | Calculado con MartJ42, con decaimiento e importancia. | Derivado | Muy alta |
| Elo externo | World Football Elo. | World Football Elo | Alta |
| Historial Mundiales | Participaciones, títulos, fases alcanzadas. | OpenFootball | Media |
| Forma reciente | Resultados últimos 5/10/20 con decaimiento. | MartJ42 + provider | Muy alta |
| H2H | Head-to-head global y por torneo. | MartJ42 | Media |
| H2H por confederación | Performance vs cada confederación. | Derivado | Media |
| Idioma / cultura | Indicadores que afectan adaptación a sede. | Manual | Baja |

### 7.2 Variables de equipo (rendimiento)

| Grupo | Variables | Ventana | Prioridad |
|---|---|---|---|
| Fuerza global | Ranking FIFA, Elo propio, Elo externo, rating ofensivo/defensivo. | Diario/partido | Muy alta |
| Producción ofensiva | Goles, xG, npxG, tiros, tiros al arco, big chances, conversión. | 5/10/20 partidos con decay | Alta |
| Solidez defensiva | Goles recibidos, xGA, tiros concedidos, clean sheets, errores defensivos. | 5/10/20 partidos | Alta |
| Calidad de rivales | Promedio Elo/ranking de oponentes recientes. | Rolling | Alta |
| Contexto competitivo | Amistoso, eliminatoria, Copa América, Euro, Nations, Mundial. | Por partido | Media-alta |
| Estilo | Posesión, presión, PPDA, juego directo, pelota parada, transiciones. | Disponibilidad | Alta si hay datos |
| Pelota parada | Goles a favor / en contra desde corner y tiro libre. | 20 partidos | Media |
| Entrenador | Tenencia, estabilidad, sistema, cambios tácticos. | Manual + API | Media |
| Fortaleza local / visitante | Performance histórico fuera de casa. | Histórico | Media |

### 7.3 Variables de partido

| Categoría | Variables | Fuente |
|---|---|---|
| Fixture | Fecha, hora UTC y local, fase, grupo, sede, estadio, país anfitrión. | FIFA |
| Descanso | Días desde último partido, fatiga acumulada, rotación probable. | Derivado |
| Viaje | Distancia desde base / sede anterior, cambio de huso horario, número de viajes. | Derivado + GeoNames |
| Importancia | Necesidad de puntos, escenario de grupo, incentivo de rotar. | Simulador + reglas |
| Mercado | Odds 1X2, over/under 2.5, BTTS, opening, closing, movimiento. | Provider odds |
| Lineup | XI probable u oficial, banco, capitán, arquero, ejecutores pelota parada. | Provider + manual |
| Disponibilidad | Lesiones, sanciones, acumulación tarjetas, dudas. | Provider + oficial |
| Árbitro | Nacionalidad, severidad amarillas/rojas/penal/partido, sesgo histórico. | Provider |
| Tiempo extra previo | Si vienen de prórroga el partido anterior. | Derivado |

### 7.4 Variables de estadio y sede

| Variable | Descripción | Fuente |
|---|---|---|
| Ciudad y país anfitrión | USA / México / Canadá. | FIFA |
| Estadio | Nombre, capacidad. | FIFA / Wikipedia |
| Altitud | Metros sobre el nivel del mar. | GeoNames |
| Dimensiones cancha | Largo × ancho. | Wikipedia / oficial |
| Tipo de césped | Natural, híbrido, sintético. | Manual / oficial |
| Techo | Abierto, cerrado, retráctil. | Manual |
| Aforo esperado | % de capacidad. | Manual / oficial |
| Huso horario | TZ del estadio. | Derivado |
| Distancia entre sedes | Matriz de viaje. | GeoNames |

### 7.5 Variables de clima y tiempo

| Variable | Descripción | Fuente |
|---|---|---|
| Temperatura kickoff | °C en hora de inicio. | Open-Meteo |
| Sensación térmica | Heat index. | Derivado |
| Humedad relativa | %. | Open-Meteo |
| Probabilidad de lluvia | %. | Open-Meteo |
| Precipitación | mm previstos. | Open-Meteo |
| Viento | km/h y dirección. | Open-Meteo |
| Calidad del aire | AQI / PM2.5. | Open-Meteo |
| Hora local | Mañana / tarde / noche. | Derivado |
| Día de la semana | L–D. | Derivado |
| Condición lumínica | Día / noche / atardecer. | Derivado |

### 7.6 Variables de jugador

| Categoría | Variables | Prioridad | Nota |
|---|---|---|---|
| Identidad | Nombre canónico, fecha nacimiento, posición, club, selección, pie hábil, altura, peso. | Baja | Requerida para mapping. |
| Disponibilidad | Convocado, titular probable, suplente, lesionado, sancionado, duda. | Alta | Define escenario. |
| Minutos recientes | Minutos últimos 30/60/90/180/365 días, titularidades, carga. | Alta | Forma + fatiga. |
| Ataque | Goles, xG, npxG, tiros, tiros al arco, toques en área, penales. | Alta | Delanteros, extremos, volantes. |
| Creación | Asistencias, xA, key passes, pases progresivos, pases al área. | Alta | Mediocampo / ataque. |
| Defensa | Duelos, tackles, intercepciones, recuperaciones, bloqueos, presiones. | Media-alta | Defensores y volantes. |
| Arquero | Save %, PSxG−GA, salidas, juego con pies, penales atajados. | Alta | Impacto no lineal. |
| Selección | Rendimiento con selección: goles, asistencias, minutos, química. | Alta | Muestra menor → regularizar. |
| Liga / club | Nivel de liga, dificultad del club, performance en competición europea. | Media | Ajuste de contexto. |
| Edad y curva | Edad, posición, curva esperada por posición. | Media | Prior. |
| Especialista | Penales, tiros libres, corners, juego aéreo, liderazgo. | Media | Cambia escenarios específicos. |
| Lesiones | Historial, recurrencia, días sin jugar. | Media | Riesgo. |
| Valor de mercado | Transfermarkt. | Baja | Proxy adicional. |

### 7.7 Variables de plantel

- Rating promedio del XI titular y del banco.
- Brecha titular–reemplazo por posición.
- Profundidad por línea: arquero, defensa, mediocampo, ataque.
- Dependencia de estrellas: cuánto cae el modelo si falta el jugador top.
- Balance táctico: cantidad de centrales, laterales, volantes defensivos, creativos, extremos, centrodelanteros.
- Especialistas: penales, tiros libres, corners, juego aéreo.
- Riesgo de disponibilidad: jugadores con poca carga reciente, tocados o muy cargados.
- Edad promedio y dispersión por línea.

### 7.8 Variables de mercado

- Odds 1X2 opening y closing.
- Over/under 2.5.
- BTTS.
- Outright campeón.
- Movimiento de líneas.

> **Política**: las odds se usan como **benchmark de calibración** y como input opcional al ensemble. Si entran al ensemble, se versiona explícitamente el modelo `with_odds` vs `without_odds` y se reporta el efecto en la tesis.

### 7.9 Variables contextuales del torneo

- Fase (grupo, 32avos, octavos, …).
- Partido número del equipo en el torneo.
- Status de clasificación al momento del partido (matemáticamente clasificado, dependiente, eliminado).
- Tiempo desde último partido para cada equipo.
- Diferencia de descanso entre los dos equipos.

---

# Parte III — Modelado

## 8. Arquitectura de modelos por capas

Un único modelo grande es frágil y poco defendible. Agamotto usa **capas combinadas**, cada una con propósito y rol académico claro.

| Capa | Técnica | Output | Rol |
|---|---|---|---|
| 0 — Naïve | Ranking FIFA + localía. | Benchmark mínimo. | Sanity check. |
| 1 — Elo | Elo propio con decaimiento e importancia. | Fuerza histórica. | Interpretable. |
| 2 — Poisson | Goles esperados ofensivos / defensivos. | Scorelines + 1X2. | Baseline de marcadores. |
| 3 — Dixon-Coles | Poisson corregido para marcadores bajos. | Mejor ajuste 0-0, 1-0, 1-1. | Literatura clásica. |
| 4 — Bayesiano jerárquico (opcional) | Pooling parcial por confederación y por liga. | λ con incertidumbre. | Mejor para muestras chicas. |
| 5 — ML tabular | LightGBM / XGBoost / CatBoost / logistic. | Probabilidades 1X2, λ, BTTS, O/U. | Captura no linealidad. |
| 6 — Player Impact | Lineup strength + impacto contrafactual. | Ajuste por plantel y por jugador. | Diferencial del producto. |
| 7 — Ensemble | Stacking / promedio ponderado. | Probabilidad final. | Optimiza Log Loss. |
| 8 — Calibración | Isotónica / Platt / temperature scaling. | Probabilidades honestas. | Clave para tesis. |

## 9. Modelo de goles y scorelines

Salida central: dos parámetros λ por equipo. Con Poisson o Dixon-Coles se obtiene la matriz P(score = i-j).

```
λ_a = f(ataque_a, defensa_b, lineup_a, bajas_b, contexto, sede, clima, viaje)
λ_b = f(ataque_b, defensa_a, lineup_b, bajas_a, contexto, sede, clima, viaje)

P(score = i-j) = P(goles_a = i) · P(goles_b = j) · corrección_DC(i, j)
P(gana A) = Σ P(i > j)
P(empate) = Σ P(i = j)
P(gana B) = Σ P(i < j)
```

**Versión bayesiana jerárquica (opcional)**: λ se modela con priors por confederación + ajuste por selección, regularizando equipos con pocos datos recientes.

## 10. ML tabular y ensemble

Modelo tabular entrenado con features de equipo, partido, plantel, jugadores agregados, sede, clima y odds (con flag).

Objetivos:

1. Clasificación 1X2.
2. λ por equipo (regresión).
3. Over/under 2.5.
4. BTTS.
5. Clean sheet por equipo.
6. P(clasificación) en knockout incluyendo penales.

El ensemble combina capas 1–6. Pesos aprendidos por **stacking** contra Log Loss en validación temporal.

## 11. Player Impact Model y contrafactuales

El diferencial real. Pipeline:

```
player_rating =
    w1 · rendimiento_club_reciente_ajustado
  + w2 · rendimiento_seleccion
  + w3 · calidad_liga_y_club
  + w4 · forma_y_minutos
  + w5 · ajuste_posicion
  + w6 · aporte_pelota_parada
  - w7 · riesgo_lesion_fatiga

lineup_strength  = Σ player_rating_titulares · peso_posicion
bench_strength   = Σ player_rating_suplentes · prob_uso
team_strength_final = team_base_strength + lineup_adjustment + chemistry_adjustment
```

**Aprendizaje de pesos `w_i`**: regresión regularizada (Ridge) con target = residuo del modelo de goles sin info de jugadores, usando datos históricos de partidos con lineups conocidos. Se valida out-of-time (no out-of-sample aleatorio).

### 11.1 Escenarios contrafactuales soportados

| Escenario | Cambio | Output |
|---|---|---|
| Titular vs baja total | Reemplazar por suplente probable. | Δp_win, Δλ, Δclasificación. |
| Titular vs 30 min | Reducir minutos esperados. | Impacto de condición física. |
| Arquero titular ausente | Cambio específico de GK rating. | ΔxGA, Δclean sheet. |
| Dos bajas simultáneas | Reemplazos múltiples + cambio táctico posible. | Efecto no lineal. |
| Cambio de sistema | Modificar pesos por posición. | Escenario táctico. |
| Cambio de sede | Recalcular clima, viaje, altitud, descanso. | Δλ por contexto. |
| Cambio de árbitro | Ajuste de severidad. | ΔP(amarilla/roja/penal). |

### 11.2 Cuidado metodológico

- Controlar calidad de rival, compañeros, club, posición y minutos.
- Regularización fuerte para muestras chicas en selección.
- Separar **impacto observado** de **impacto estimado**.
- Reportar **incertidumbre** del contrafactual.
- Priors por posición, edad, club, liga para jugadores con pocos datos.

## 12. Calibración, validación académica y prevención de leakage

### 12.1 Métricas

| Métrica | Mide | Uso |
|---|---|---|
| Accuracy | % aciertos 1X2 | Mostrar, no optimizar solo. |
| Log Loss | Penaliza confianza errada | Métrica principal del ensemble. |
| Brier Score | Distancia cuadrática a outcome | Calidad probabilística. |
| Calibration curve | Si el 60% ocurre cerca de 60% | Gráfico clave para tesis. |
| RPS | Score para outcomes ordenados | Opcional. |
| MAE goles | Error en λ | Evalúa modelo de scoreline. |
| ECE | Expected Calibration Error | Resumen numérico de calibración. |

### 12.2 Calibración

Isotonic regression sobre validación out-of-time. Comparar también temperature scaling y Platt.

### 12.3 Validación

- **Backtesting temporal estricto**: split por fecha, nunca aleatorio.
- Walk-forward: entrenar hasta T, validar en [T, T+ventana], avanzar.
- Comparar contra: ranking FIFA, Elo, Poisson simple, Dixon-Coles, odds implícitas, modelo del autor del paper de referencia.
- Reportar intervalos por bootstrap de partidos.

### 12.4 Prevención de leakage (crítico)

- **Feature freeze** por partido: cualquier feature de entrenamiento debe poder calcularse con datos `<= kickoff - margen_seguridad`.
- Ratings Elo / xG rolling se calculan con corte explícito; nunca con la versión "actual".
- Odds: usar **opening** para entrenar, **closing** solo como benchmark si se quiere medir eficiencia de mercado.
- Lineups: en entrenamiento, usar lineup oficial conocido pre-kickoff; en inferencia previa, usar lineup probable y registrar la versión.
- Tests automáticos de leakage: para cada feature, verificar que `feature.timestamp < match.kickoff`.

---

# Parte IV — Simulador multiverso

## 13. Monte Carlo del torneo completo

Generador de universos. Configuración: N = 100.000 simulaciones por corrida (escalable a 250.000).

### 13.1 Flujo

1. Para cada partido de fase de grupos, samplear scoreline desde la matriz P(i-j).
2. Calcular puntos, diferencia de gol, GF, desempates oficiales.
3. Ordenar cada grupo: 1°, 2°, 3°.
4. Seleccionar los 8 mejores terceros con reglas oficiales.
5. Asignar cruces de 32avos por reglamento.
6. Simular eliminatorias: 90′ → prórroga → penales (modelo separado).
7. Persistir cada universo: ganador de cada partido, marcador, campeón, ruta.
8. Agregar a probabilidades por equipo, partido, fase, ruta.

### 13.2 Outputs por equipo

| Output | Descripción |
|---|---|
| p_group_winner | Probabilidad de salir primero del grupo. |
| p_group_runner_up | Segundo. |
| p_best_third | Pasar como mejor tercero. |
| p_round_32 | Llegar a 32avos. |
| p_round_16 | Octavos. |
| p_quarter | Cuartos. |
| p_semi | Semifinal. |
| p_final | Final. |
| p_champion | Campeón. |
| modal_path | Ruta modal: rivales más probables por fase. |
| expected_points_group | Puntos esperados en fase de grupos. |
| upset_risk | Probabilidad de caer en 32avos / octavos contra equipo de menor Elo. |

### 13.3 Outputs por partido

- 1X2.
- Top-N marcadores.
- λ por equipo.
- O/U 2.5, BTTS.
- Probabilidad de prórroga y penales si aplica.
- "Impacto sistémico": cuánto cambia la distribución del torneo según resultado.

### 13.4 Outputs por torneo

- Top campeones más probables.
- Top campeones improbables aún posibles (cola de la distribución).
- Heatmap: P(equipo_i vs equipo_j) por fase.
- Partidos pivote del torneo.

---

## 14. El Ojo de Agamotto: navegación de líneas de tiempo

La interfaz no muestra "una predicción". Muestra **el espacio de universos**.

### 14.1 Modos de vista

1. **Vista panorámica**: 100k universos agrupados por campeón. Visualización tipo sankey o starburst.
2. **Vista por equipo**: todos los universos donde Equipo X llega a fase Y. Probabilidad, rivales, marcadores típicos.
3. **Vista por partido**: distribución completa de scorelines + impacto en bracket.
4. **Vista bracket multiverso**: bracket con ancho de línea proporcional a probabilidad de cada cruce.
5. **Vista "qué pasa si"**: el usuario fija condiciones y el Ojo colapsa al subconjunto compatible.
6. **Vista de bifurcaciones**: lista de partidos ordenados por cuánto cambian el torneo.
7. **Vista contrafactual de jugador**: con / sin un jugador o lista de jugadores.

### 14.2 Manipulación: "colapsar la realidad"

El usuario puede aplicar **condiciones** (filtros sobre el conjunto de universos):

- Fijar resultado o marcador exacto.
- Fijar campeón hipotético.
- Sacar / poner jugador.
- Cambiar sede o clima.
- Sustituir un árbitro.
- Fijar un grupo entero.

El motor:

1. Calcula la **probabilidad condicional** del estado fijado.
2. Filtra los universos compatibles.
3. Si son insuficientes (< umbral), **re-samplea** condicionado.
4. Devuelve nuevas distribuciones de todo el torneo.

### 14.3 Universos extremos

Sección "Multiverso loco": muestra los universos más improbables con probabilidad > umbral. Educativo y atractivo para producto.

---

## 15. Contrafactuales encadenados

El usuario puede componer múltiples condiciones: *"si Brasil pierde el primer partido y además su 9 titular se lesiona en el segundo"*. El motor:

1. Aplica los cambios al estado del torneo en orden temporal.
2. Recalcula partidos posteriores con features actualizadas (descanso, presión, lesión, etc.).
3. Reporta probabilidades y diff vs baseline.
4. Marca cada condición con su contribución al efecto total (descomposición tipo Shapley aproximada).

---

# Parte V — Arquitectura técnica

## 16. Stack tecnológico

```
[ Fuentes externas: FIFA, Statorium, API-Football, StatsBomb, Open-Meteo, ... ]
        ↓
[ Adapters por provider (Python) ]
        ↓
[ Raw storage: PostgreSQL + object storage (S3/Supabase Storage) ]
        ↓
[ Normalización + identity resolution ]
        ↓
[ Feature store versionado ]
        ↓
[ Model training (offline) → MLflow registry ]
        ↓
[ Batch predictions + on-demand inference ]
        ↓
[ Monte Carlo simulator (worker pool) ]
        ↓
[ FastAPI backend ]
        ↓
[ Next.js + React + TypeScript (App web "Ojo de Agamotto") ]
```

### 16.1 Componentes

| Capa | Tecnología | Uso |
|---|---|---|
| Backend | FastAPI | APIs internas, inferencia, simulación on-demand. |
| DB | PostgreSQL | Datos normalizados, features, predicciones, simulaciones. |
| Object storage | S3 / Supabase Storage | Raw payloads, snapshots Monte Carlo. |
| Cache | Redis | Predicciones, simulaciones pesadas, rate limit. |
| Jobs | Prefect (o Celery / RQ) | Ingesta, features, recálculos, simulaciones. |
| ML | Python, pandas/polars, scikit-learn, LightGBM, CatBoost, PyMC (opcional bayesiano) | Entrenamiento y evaluación. |
| Model registry | MLflow | Versionado de modelos, parámetros, métricas. |
| Frontend | Next.js + React + TypeScript + Tailwind | App web y simulador. |
| Visualización | ECharts, Recharts, d3 (bracket multiverso) | Heatmaps, brackets, sankey, calibración. |
| Deploy MVP | Vercel + Render/Railway/Fly + Supabase | Bajo costo. |
| Deploy robusto | Cloud Run / ECS + Cloud SQL / RDS + S3 | Producción. |
| CI/CD | GitHub Actions | Tests, lint, deploy. |
| Observabilidad | Sentry + Prometheus + Grafana | Errores, métricas. |

## 17. Modelo de datos (resumen)

### Tablas core

- `tournaments` — el Mundial 2026 y futuros.
- `teams` — selecciones, IDs canónicos.
- `team_aliases` — identity resolution entre APIs.
- `players` — jugadores canónicos.
- `player_aliases` — identity resolution.
- `squads` — versiones de plantel (`status`, `valid_from`, `valid_to`).
- `squad_players` — jugador → plantel con `role`, `availability`, `is_starter_prob`.
- `venues` — estadios con `country`, `city`, `altitude_m`, `capacity`, `surface`, `roof`, `tz`.
- `matches` — partido oficial con `stage`, `group`, `kickoff_utc`, `venue_id`, `team_home_id`, `team_away_id`, `status`.
- `referees` — árbitro y stats.
- `match_referees` — asignación.
- `lineups` — versiones (`probable`, `official`) por partido.
- `events` — eventos del partido (post).
- `weather_forecasts` — pronóstico por sede/partido con timestamp.
- `weather_observed` — clima observado kickoff.
- `odds` — odds por proveedor y momento.
- `injuries` — lesiones y disponibilidad.

### Tablas analíticas

- `feature_snapshots` — features calculadas con `feature_set_version`, `calculated_at`, `as_of_kickoff`.
- `model_versions` — modelo + hiperparámetros + métricas.
- `predictions` — predicción por modelo y partido (`p_home`, `p_draw`, `p_away`, `lambda_home`, `lambda_away`, `scoreline_matrix_json`, `model_version_id`, `created_at`).
- `simulations` — corridas Monte Carlo (`n_runs`, `model_version_id`, `created_at`).
- `simulation_universes` — universo individual (opcional, samplear para vista multiverso).
- `simulation_aggregates` — agregados por equipo, partido y fase.
- `counterfactuals` — guardado de escenarios del usuario.

### Tablas operativas

- `raw_payloads` — JSON crudo, hash, provider, timestamp.
- `ingestion_runs` — corridas de ingesta.
- `audit_log` — eventos importantes (cambio de plantel, lesión publicada, etc.).

## 18. API interna y contratos

Convención: todas las respuestas llevan `model_version`, `as_of` y `confidence`.

### 18.1 Endpoints principales

| Endpoint | Descripción |
|---|---|
| `GET /matches` | Lista de partidos con filtros. |
| `GET /matches/{id}/prediction` | 1X2, λ, scorelines, factores top. |
| `GET /matches/{id}/scoreline-matrix` | Matriz P(i-j) completa. |
| `GET /teams` | Lista de selecciones. |
| `GET /teams/{id}/tournament-outlook` | p_round_X, p_champion, ruta modal. |
| `GET /teams/{id}/squad?version=latest` | Plantel actual con disponibilidad. |
| `GET /players/{id}/impact?match_id=...` | Impacto del jugador en un partido. |
| `GET /players/{id}/impact/tournament` | Impacto agregado en el torneo. |
| `GET /venues/{id}` | Datos de sede + clima esperado. |
| `GET /simulation/latest` | Resumen del último Monte Carlo. |
| `POST /simulation/counterfactual` | Ejecuta simulación condicionada (input: lista de condiciones). |
| `GET /multiverse/champions` | Distribución de campeones. |
| `GET /multiverse/pivot-matches` | Partidos pivote ordenados por impacto sistémico. |
| `GET /validation/calibration` | Curva, Brier, Log Loss por baseline. |
| `GET /validation/feature-importance` | SHAP / importancia. |

### 18.2 Ejemplo de respuesta

```json
{
  "match_id": "WC2026-G7-M01",
  "model_version": "agamotto_ensemble_1.2.0",
  "as_of": "2026-06-12T14:00:00Z",
  "teams": { "home": "ARG", "away": "MEX" },
  "venue": { "id": "AZTECA", "altitude_m": 2240, "kickoff_temp_c": 22 },
  "probabilities": {
    "home_win": 0.46, "draw": 0.27, "away_win": 0.27,
    "btts": 0.55, "over_2_5": 0.52,
    "expected_goals": { "home": 1.45, "away": 1.10 },
    "top_scorelines": [
      { "score": "1-1", "p": 0.115 },
      { "score": "1-0", "p": 0.108 },
      { "score": "2-1", "p": 0.092 }
    ]
  },
  "top_factors": [
    { "name": "elo_diff", "weight": 0.28, "direction": "home" },
    { "name": "altitude_acclimatization", "weight": 0.12, "direction": "away" },
    { "name": "rest_days_diff", "weight": 0.08, "direction": "home" }
  ],
  "confidence": { "brier_recent": 0.198, "calibration_ece": 0.024 }
}
```

## 19. App web: pantallas, UX y visualizaciones

### 19.1 Pantallas principales

1. **Home — "Abre el Ojo"**: ranking de campeones probables, partidos del día, atajos.
2. **Partido**: predicción 1X2, heatmap de scorelines, factores top, clima, sede, árbitro, lineups probables.
3. **Equipo**: outlook de torneo, ruta modal, partidos clave, plantel, impacto por jugador.
4. **Jugador**: ficha, impacto en torneo y por partido, contrafactual rápido.
5. **Sede**: datos del estadio, clima, partidos asignados, efecto sede.
6. **Simulador multiverso (Ojo de Agamotto)**: la pantalla central — sankey de universos, panel de condiciones, recálculo en vivo.
7. **Bracket multiverso**: bracket interactivo con ancho de línea = probabilidad.
8. **Partidos pivote**: ranking de partidos por impacto sistémico.
9. **Panel académico**: curva de calibración, Brier, Log Loss, baselines, ablation, drift.
10. **Acerca del modelo**: versiones, metodología, limitaciones.

### 19.2 Principios UX

- Cada número probabilístico lleva **timestamp** y **versión de modelo**.
- "Cómo se calcula esto" accesible en un click.
- Comparación contra baselines siempre visible.
- Onboarding corto que explica la metáfora del Ojo.
- Mobile-first para vistas de partido y equipo; desktop optimizado para Ojo y bracket.

---

# Parte VI — Implementación

## 20. Roadmap por fases (sin fechas, ordenado por dependencia)

### Fase 0 — Cimientos
- Repo, CI, lint, type checks, tests base.
- Modelo de datos inicial (tablas core).
- Adapter FIFA + ingesta de fixtures, equipos, sedes.
- Identity resolution mínima.

### Fase 1 — Baseline end-to-end
- Ingesta históricos (MartJ42 + OpenFootball).
- Elo propio + Poisson simple.
- Simulador Monte Carlo del torneo (con datos de Elo + Poisson).
- API mínima (`/matches`, `/teams`, `/simulation/latest`).
- Frontend mínimo: tabla de partidos + outlook de campeones.

### Fase 2 — Calidad de datos y modelo
- Adapter de provider (Statorium o API-Football).
- Lineups probables, lesiones, odds.
- Dixon-Coles.
- ML tabular (LightGBM) sobre features de equipo + partido.
- Calibración (isotonic).
- Panel académico v1: calibración + Brier + comparación con baselines.

### Fase 3 — Jugadores y contrafactuales
- Ingesta de stats de jugador (provider + StatsBomb Open).
- Player Impact Model.
- Endpoint y UI de contrafactual por jugador.
- Ensemble v1.

### Fase 4 — Sede, clima y multiverso
- Ingesta clima (Open-Meteo).
- Features de sede, viaje, altitud, clima.
- Multiverso navegable (Ojo de Agamotto) con sankey y bracket multiverso.
- Partidos pivote.

### Fase 5 — Pulido y defensa
- Tests de leakage automatizados.
- Walk-forward backtesting full.
- Feature importance + SHAP.
- Vista de universos extremos.
- Documentación de tesis.

### Fase 6 — Extensiones post-MVP
- Eventos live, recálculo intra-partido.
- Modelo bayesiano jerárquico.
- Modo apuestas educativo (sin recomendación).
- Otros torneos.

## 21. Backlog técnico inicial (top 20)

1. Definir esquema SQL inicial y migraciones.
2. Adapter FIFA + tabla `matches` + tabla `venues`.
3. Adapter MartJ42 + tabla `historical_matches`.
4. Implementación Elo propio con decaimiento.
5. Modelo Poisson simple por equipo.
6. Generador Monte Carlo de fase de grupos.
7. Generador Monte Carlo de knockout + 32avos + best-thirds.
8. Endpoints `/matches`, `/teams/{id}/tournament-outlook`.
9. Frontend Next.js base + página home.
10. Adapter de provider (Statorium o API-Football) con manejo de rate limit.
11. Ingesta de lineups, lesiones, odds.
12. Implementación Dixon-Coles.
13. Pipeline de features → feature store v1.
14. Entrenamiento LightGBM y MLflow registry.
15. Calibración isotónica y endpoint `/validation/calibration`.
16. Modelo de impacto de jugadores v1.
17. Endpoint y UI de contrafactual.
18. Ingesta Open-Meteo + tabla `weather_forecasts`.
19. Vista del Ojo (sankey + condiciones).
20. Suite de tests de leakage temporal.

## 22. Costos, alternativas y criterios de compra

### 22.1 Costos estimados (modo intermedio recomendado)

| Concepto | Costo orientativo |
|---|---|
| Statorium Premium World Cup | USD 499 one-time |
| API-Football Pro o Sportmonks | USD 19–50 / mes |
| Open-Meteo | USD 0 |
| Hosting MVP (Vercel + Render + Supabase) | USD 0–25 / mes |
| Object storage | USD 0–5 / mes |
| Monitoring (Sentry free) | USD 0 |
| **Total** | **~ USD 500 one-time + USD 25–80 / mes** |

### 22.2 Criterios para elegir provider

- Cobertura de las **48 selecciones del Mundial 2026**.
- Lineups oficiales con latencia < 15 minutos.
- Histórico de stats por jugador en selecciones.
- Eventos post-partido con xG.
- Odds con opening y closing.
- Licencia compatible con uso académico y app pública.
- SLA o uptime documentado.

## 23. Riesgos, limitaciones y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Provider no entrega lineups a tiempo | Modelo de jugadores degradado en partido | Fallback a lineup probable + flag de calidad |
| Cobertura de stats por jugador en selección es baja | Player Impact ruidoso | Combinar con stats de club + priors regularizados |
| Cambios de plantel de último momento | Predicciones obsoletas | Cadencia de ingesta densa + recálculo automático |
| Leakage temporal en features | Tesis indefensible | Tests automáticos por feature + walk-forward backtesting |
| Sobreajuste del ensemble | Mala generalización | Validación out-of-time + regularización + ablation |
| Costos de API escalan | Insostenible | Adapter intercambiable + cache agresivo |
| Cambios en formato del torneo | Reglas obsoletas | Reglas como configuración versionada, no hardcode |
| Performance Monte Carlo | UX lenta | Workers + cache de simulaciones + downsampling para vista |
| Identidad de jugadores entre APIs | Datos corruptos | Tabla de identity resolution + revisión humana periódica |
| Odds usadas como feature filtran señal del mercado | Tesis débil | Reportar modelo con y sin odds, comparar |

## 24. Estructura sugerida para la tesis

1. **Introducción y motivación** — la oportunidad del Mundial 2026 con 48 equipos.
2. **Estado del arte** — Dixon-Coles, Elo, ML aplicado a fútbol, modelos bayesianos.
3. **Datos** — fuentes, gobierno, identity resolution, leakage.
4. **Variables** — catálogo, hipótesis y ablation.
5. **Modelos** — capas, ecuaciones, justificación de cada una.
6. **Calibración** — métricas y procedimiento.
7. **Simulador Monte Carlo** — diseño, performance, validación de reglas.
8. **Player Impact** — diseño contrafactual y limitaciones.
9. **Resultados** — comparación con baselines, calibración, ablation, feature importance.
10. **Aplicación web** — arquitectura y producto (Agamotto).
11. **Discusión** — limitaciones, ética, no-uso para apuestas.
12. **Conclusiones y trabajo futuro**.
13. **Apéndices** — esquemas, contratos API, configuración de reglas, código de referencia.

## 25. Próximos pasos inmediatos

1. **Crear el repo `agamotto`** con la estructura de carpetas del Anexo C.
2. **Levantar Postgres local + migraciones iniciales** con las tablas core.
3. **Implementar adapter FIFA + MartJ42** y poblar fixtures + histórico.
4. **Codear Elo + Poisson + Monte Carlo** como baseline end-to-end.
5. **Servir un endpoint y una página** que muestre p_champion por equipo.
6. **Decidir provider de pago** (Statorium vs API-Football) con prueba real de un partido.

A partir de ahí el resto del roadmap se desbloquea en orden.

---

# Anexos

## Anexo A — Ejemplo JSON: contrafactual del Ojo

```json
{
  "scenario_id": "user-cf-0001",
  "base_model_version": "agamotto_ensemble_1.2.0",
  "conditions": [
    { "type": "fix_result", "match_id": "WC2026-G1-M01", "home_score": 2, "away_score": 0 },
    { "type": "remove_player", "team_id": "BRA", "player_id": "VINI_JR", "from_match": "WC2026-G2-M03" },
    { "type": "override_weather", "match_id": "WC2026-G2-M03", "temp_c": 35, "humidity": 80 }
  ],
  "simulation_runs": 50000,
  "result": {
    "champion_distribution": [
      { "team": "ARG", "p": 0.18 },
      { "team": "FRA", "p": 0.16 },
      { "team": "BRA", "p": 0.09 }
    ],
    "delta_vs_baseline": {
      "BRA": -0.04,
      "ARG": +0.02,
      "FRA": +0.01
    }
  }
}
```

## Anexo B — Esquema SQL inicial (extracto)

```sql
CREATE TABLE teams (
    team_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    confederation TEXT NOT NULL,
    fifa_code TEXT
);

CREATE TABLE venues (
    venue_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    altitude_m INTEGER,
    capacity INTEGER,
    surface TEXT,
    roof TEXT,
    timezone TEXT NOT NULL
);

CREATE TABLE matches (
    match_id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    group_label TEXT,
    kickoff_utc TIMESTAMPTZ NOT NULL,
    venue_id TEXT REFERENCES venues(venue_id),
    home_team_id TEXT REFERENCES teams(team_id),
    away_team_id TEXT REFERENCES teams(team_id),
    status TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE feature_snapshots (
    snapshot_id BIGSERIAL PRIMARY KEY,
    match_id TEXT REFERENCES matches(match_id),
    feature_set_version TEXT NOT NULL,
    as_of_kickoff TIMESTAMPTZ NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    features JSONB NOT NULL
);

CREATE TABLE predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    match_id TEXT REFERENCES matches(match_id),
    model_version_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    p_home NUMERIC, p_draw NUMERIC, p_away NUMERIC,
    lambda_home NUMERIC, lambda_away NUMERIC,
    scoreline_matrix JSONB,
    top_factors JSONB
);

CREATE TABLE simulations (
    simulation_id BIGSERIAL PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    model_version_id TEXT NOT NULL,
    n_runs INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aggregates JSONB NOT NULL
);
```

## Anexo C — Esqueleto de repo

```
agamotto/
├── apps/
│   ├── web/                   # Next.js
│   └── api/                   # FastAPI
├── packages/
│   ├── core/                  # dominio, IDs canónicos, reglas
│   ├── ingestion/             # adapters por provider
│   ├── features/              # feature store + ablation
│   ├── models/                # elo, poisson, dixon-coles, ml, player-impact, ensemble, calibration
│   ├── simulator/             # Monte Carlo + reglas oficiales
│   ├── multiverse/            # Ojo de Agamotto (filtrado y muestreo condicional)
│   └── shared/                # tipos compartidos
├── infra/
│   ├── docker/
│   ├── migrations/
│   └── deploy/
├── notebooks/                 # análisis exploratorio, EDA, validación
├── tests/
│   ├── unit/
│   ├── integration/
│   └── leakage/
├── docs/
│   ├── plan.md                # este documento
│   ├── data-dictionary.md
│   ├── api-contracts.md
│   └── tesis/
└── .github/workflows/
```

## Anexo D — Referencias

1. FIFA World Cup 2026 — formato oficial, fixtures y sedes (fifa.com).
2. FIFA — Reglamento del torneo y reglas de desempate.
3. FIFA — Política de planteles 2026 (26 jugadores).
4. Dixon, M. J. & Coles, S. G. — *Modelling Association Football Scores and Inefficiencies in the Football Betting Market*.
5. Gneiting, T. & Raftery, A. E. — *Strictly Proper Scoring Rules, Prediction, and Estimation*.
6. Brier, G. W. — *Verification of Forecasts Expressed in Terms of Probability*.
7. World Football Elo Ratings — eloratings.net.
8. Mart Jürisoo — International football results from 1872 (Kaggle).
9. StatsBomb Open Data — github.com/statsbomb/open-data.
10. OpenFootball — datasets de Mundiales (CC0).
11. Statorium / API-Football / Sportmonks / SportsDataIO — APIs deportivas.
12. Open-Meteo — pronóstico e histórico de clima.
13. MLflow — model registry y experiment tracking.
14. SHAP — explicabilidad de modelos tabulares.

---

*"No vemos un futuro. Los vemos todos."* — Agamotto
