/* =========================================================
   DASHBOARD PLANTA TRANSMETAL
   Grupo AG · División Industrial
   Versión Senior — Enfoque industrial / directivo
   Incluye: Modo normal + Modo TV (carrusel automático)
========================================================= */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../supabaseClient";
import { catalogo } from "../data/catalogo";

/* =========================================================
   1. CONFIGURACIÓN DE NEGOCIO
========================================================= */

const METAS = Object.freeze({
  OEE: 0.6557,
  DISPONIBILIDAD: 0.97,
  CALIDAD: 0.995,
  DESEMPENO: 0.95,
});

const UMBRALES = Object.freeze({
  VERDE: 0.99,
  AMARILLO: 0.92,
});

const FECHA_ULTIMO_CPT = new Date(2023, 8, 19);

const MESES = Object.freeze([
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]);

/* =========================================================
   PALETA CORPORATIVA GRUPO AG
========================================================= */

const MARCA = Object.freeze({
  primario: "#003DA5",
  primarioDark: "#002B73",
  primarioLight: "#E6EDF9",
  primarioBorder: "#B3C7E6",
  secundario: "#1E5BC6",
  secundarioLight: "#DCE7F7",
  gris: "#64748B",
  grisSuave: "#94A3B8",
});

const TEMA = Object.freeze({
  verde: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  amarillo: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  rojo: {
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  gris: {
    text: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
});

/* =========================================================
   2. UTILIDADES
========================================================= */

const pad = (n) => String(n).padStart(2, "0");

const fechaISO = (a, m, d) => `${a}-${pad(m + 1)}-${pad(d)}`;

const formatearFecha = (f) => {
  if (!f) return "—";
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
};

const diasEnMes = (a, m) => new Date(a, m + 1, 0).getDate();

const numero = (v) => Number(v || 0).toLocaleString("es-GT");

const normalize = (txt) =>
  txt
    ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    : "";

function estadoKPI(valor, meta) {
  if (valor == null || meta == null || meta === 0) return "gris";
  const c = valor / meta;
  if (c >= UMBRALES.VERDE) return "verde";
  if (c >= UMBRALES.AMARILLO) return "amarillo";
  return "rojo";
}

function cumplimiento(valor, meta) {
  if (valor == null || !meta) return null;
  return valor / meta;
}

function variacion(actual, anterior) {
  if (actual == null || anterior == null || anterior === 0) return null;
  return (actual - anterior) / anterior;
}

function calcularRango(anio, mes, hoy = new Date()) {
  const sel = anio * 12 + mes;
  const act = hoy.getFullYear() * 12 + hoy.getMonth();
  const inicio = fechaISO(anio, mes, 1);

  if (sel > act) return { inicio, fin: null, futuro: true };

  if (sel === act) {
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    if (ayer.getMonth() !== mes || ayer.getFullYear() !== anio) {
      return { inicio, fin: null, futuro: false, sinDiasCerrados: true };
    }
    return {
      inicio,
      fin: fechaISO(ayer.getFullYear(), ayer.getMonth(), ayer.getDate()),
      futuro: false,
    };
  }

  return {
    inicio,
    fin: fechaISO(anio, mes, diasEnMes(anio, mes)),
    futuro: false,
  };
}

function rangoMesAnterior(anio, mes) {
  const d = new Date(anio, mes - 1, 1);
  return {
    inicio: fechaISO(d.getFullYear(), d.getMonth(), 1),
    fin: fechaISO(
      d.getFullYear(),
      d.getMonth(),
      diasEnMes(d.getFullYear(), d.getMonth())
    ),
  };
}

/* =========================================================
   3. CÁLCULO OEE
========================================================= */

function buildCatalogoMap() {
  const map = new Map();
  catalogo.forEach((m) => {
    map.set(`${normalize(m.maquina)}|${normalize(m.proceso)}`, {
      eph: Number(m.eph) || 1,
    });
  });
  return map;
}

function calcularTiempos(registro, catalogoMap) {
  const {
    maquina,
    proceso,
    inicio,
    fin,
    piezastotales,
    piezasbuenas,
    paros,
  } = registro;
  if (!maquina || !proceso || !inicio || !fin) return null;
  if (piezastotales == null || piezasbuenas == null) return null;

  const eph =
    catalogoMap.get(`${normalize(maquina)}|${normalize(proceso)}`)?.eph || 1;

  const t0 = new Date(`1970-01-01T${inicio}:00`);
  const t1 = new Date(`1970-01-01T${fin}:00`);
  const tiempoProgramado = (t1 - t0) / 60000;
  if (tiempoProgramado <= 0) return null;

  const planeados = (paros || [])
    .filter((p) => p.tipo === "Planeado")
    .reduce((a, b) => a + Number(b.minutos || 0), 0);

  const noPlaneados = (paros || [])
    .filter((p) => p.tipo !== "Planeado")
    .reduce((a, b) => a + Number(b.minutos || 0), 0);

  const piezasMalas = Math.max(0, piezastotales - piezasbuenas);
  const tiempoOperativo = tiempoProgramado - noPlaneados - planeados;
  const tiempoOperativoNeto = piezastotales / eph;
  const tiempoUtil = tiempoOperativoNeto - piezasMalas / eph;

  return { tiempoProgramado, tiempoOperativo, tiempoOperativoNeto, tiempoUtil };
}

function agregarOEE(calculos) {
  let tp = 0, to = 0, ton = 0, tu = 0;
  calculos.forEach((c) => {
    tp += c.tiempoProgramado;
    to += c.tiempoOperativo;
    ton += c.tiempoOperativoNeto;
    tu += c.tiempoUtil;
  });

  if (tp <= 0)
    return { disponibilidad: null, desempeno: null, calidad: null, oee: null };

  const disponibilidad = to / tp;
  const desempeno = to > 0 ? ton / to : null;
  const calidad = ton > 0 ? tu / ton : null;
  const oee =
    disponibilidad != null && desempeno != null && calidad != null
      ? disponibilidad * desempeno * calidad
      : null;

  return { disponibilidad, desempeno, calidad, oee };
}

/* =========================================================
   4. HOOKS
========================================================= */

function useDashboardData(anio, mes) {
  const hoy = useMemo(() => new Date(), []);
  const rango = useMemo(() => calcularRango(anio, mes, hoy), [anio, mes, hoy]);
  const rangoPrev = useMemo(() => rangoMesAnterior(anio, mes), [anio, mes]);

  const [data, setData] = useState({
    registros: [],
    produccion: [],
    registrosPrev: [],
    produccionPrev: [],
  });
  const [estado, setEstado] = useState({ loading: true, error: null });

  const cargar = useCallback(async () => {
    setEstado({ loading: true, error: null });

    if (!rango.fin) {
      setData({
        registros: [],
        produccion: [],
        registrosPrev: [],
        produccionPrev: [],
      });
      setEstado({ loading: false, error: null });
      return;
    }

    const [reg, prod, regPrev, prodPrev] = await Promise.all([
      supabase
        .from("registros")
        .select("*")
        .gte("fecha", rango.inicio)
        .lte("fecha", rango.fin),
      supabase
        .from("produccion_diaria")
        .select("fecha, meta_carretas, real_carretas")
        .gte("fecha", rango.inicio)
        .lte("fecha", rango.fin)
        .order("fecha", { ascending: true }),
      supabase
        .from("registros")
        .select("*")
        .gte("fecha", rangoPrev.inicio)
        .lte("fecha", rangoPrev.fin),
      supabase
        .from("produccion_diaria")
        .select("fecha, meta_carretas, real_carretas")
        .gte("fecha", rangoPrev.inicio)
        .lte("fecha", rangoPrev.fin),
    ]);

    const errores = [reg, prod, regPrev, prodPrev].filter((r) => r.error);
    if (errores.length) {
      console.error("Errores Supabase:", errores.map((e) => e.error));
    }

    setData({
      registros: reg.data || [],
      produccion: prod.data || [],
      registrosPrev: regPrev.data || [],
      produccionPrev: prodPrev.data || [],
    });

    setEstado({
      loading: false,
      error: errores.length
        ? errores.length === 4
          ? "No fue posible cargar los datos del tablero."
          : "Algunos datos no pudieron cargarse; los KPIs mostrados son parciales."
        : null,
    });
  }, [rango, rangoPrev]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { rango, ...data, ...estado, recargar: cargar };
}

function useOEE(registros, registrosPrev = []) {
  const catalogoMap = useMemo(buildCatalogoMap, []);

  return useMemo(() => {
    const actuales = registros
      .map((r) => calcularTiempos(r, catalogoMap))
      .filter(Boolean);
    const anteriores = registrosPrev
      .map((r) => calcularTiempos(r, catalogoMap))
      .filter(Boolean);

    const kpis = agregarOEE(actuales);
    const kpisPrev = agregarOEE(anteriores);

    return {
      ...kpis,
      tendencia: {
        oee: variacion(kpis.oee, kpisPrev.oee),
        disponibilidad: variacion(kpis.disponibilidad, kpisPrev.disponibilidad),
        desempeno: variacion(kpis.desempeno, kpisPrev.desempeno),
        calidad: variacion(kpis.calidad, kpisPrev.calidad),
      },
    };
  }, [registros, registrosPrev, catalogoMap]);
}

function useModoTV(activo) {
  const [, setFullscreen] = useState(false);

  useEffect(() => {
    const entrar = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setFullscreen(true);
        }
      } catch (err) {
        console.warn("Fullscreen no disponible:", err);
      }
    };

    const salir = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn(err);
      }
      setFullscreen(false);
    };

    if (activo) entrar();
    else salir();
  }, [activo]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
}

function useAutoRefresh(activo, callback, intervaloMs = 300000) {
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => callback(), intervaloMs);
    return () => clearInterval(id);
  }, [activo, callback, intervaloMs]);
}

/* =========================================================
   5. COMPONENTES UI (modo normal)
========================================================= */

/* ---------- KPI Card ---------- */
function KpiCard({
  titulo,
  valor,
  unidad,
  variacion,
  estado = "gris",
  destacado = false,
}) {
  const tema = TEMA[estado];
  const flecha = variacion == null ? null : variacion >= 0 ? "▲" : "▼";
  const colorVar =
    variacion == null
      ? "text-slate-400"
      : variacion >= 0
      ? "text-emerald-600"
      : "text-rose-600";

  return (
    <div
      className={`rounded-xl border ${tema.border} ${
        destacado ? tema.bg : "bg-white"
      } p-3.5 transition-shadow hover:shadow-sm`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {titulo}
        </p>
        <span className={`h-1.5 w-1.5 rounded-full ${tema.dot}`} aria-hidden />
      </div>

      <p className={`mt-1.5 text-2xl font-black tabular-nums tracking-tight ${tema.text}`}>
        {valor}
        {unidad && (
          <span className="ml-1 text-xs font-semibold text-slate-400">
            {unidad}
          </span>
        )}
      </p>

      {variacion != null && (
        <p className={`mt-0.5 text-[11px] font-semibold tabular-nums ${colorVar}`}>
          {flecha} {(Math.abs(variacion) * 100).toFixed(1)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

/* ---------- Gauge ---------- */
const GAUGE = { CX: 130, CY: 130, R: 96, GROSOR: 14, ANGULO: 220 };

function gaugePolar(deg) {
  const rad = ((deg - 90 - 110) * Math.PI) / 180;
  return {
    x: GAUGE.CX + GAUGE.R * Math.cos(rad),
    y: GAUGE.CY + GAUGE.R * Math.sin(rad),
  };
}

function gaugeArc(start, end) {
  const s = gaugePolar(start);
  const e = gaugePolar(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${GAUGE.R} ${GAUGE.R} 0 ${large} 1 ${e.x} ${e.y}`;
}

function Gauge({ valor, meta, titulo, subtitulo }) {
  const estado = estadoKPI(valor, meta);
  const tema = TEMA[estado];

  const clamp = (v) => Math.min(Math.max(v ?? 0, 0), 1);
  const posRojo = clamp(meta * 0.92) * GAUGE.ANGULO;
  const posVerde = clamp(meta * 0.99) * GAUGE.ANGULO;
  const angulo = clamp(valor) * GAUGE.ANGULO;
  const aguja = gaugePolar(angulo);

  return (
    <figure
      className="flex flex-col items-center"
      role="img"
      aria-label={`${titulo}: ${
        valor != null ? (valor * 100).toFixed(1) + "%" : "sin datos"
      }. Meta ${(meta * 100).toFixed(2)}%.`}
    >
      <figcaption className="w-full text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {titulo}
        </p>
        {subtitulo && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
        )}
      </figcaption>

      <svg viewBox="0 0 260 180" className="w-full max-w-[280px] mt-2">
        <path
          d={gaugeArc(0, GAUGE.ANGULO)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={GAUGE.GROSOR}
          strokeLinecap="round"
        />
        <path
          d={gaugeArc(0, posRojo)}
          fill="none"
          stroke="#fb7185"
          strokeWidth={GAUGE.GROSOR}
          strokeLinecap="round"
        />
        <path
          d={gaugeArc(posRojo, posVerde)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={GAUGE.GROSOR}
        />
        <path
          d={gaugeArc(posVerde, GAUGE.ANGULO)}
          fill="none"
          stroke="#10b981"
          strokeWidth={GAUGE.GROSOR}
          strokeLinecap="round"
        />

        <line
          x1={GAUGE.CX}
          y1={GAUGE.CY}
          x2={aguja.x}
          y2={aguja.y}
          stroke={MARCA.primario}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={GAUGE.CX} cy={GAUGE.CY} r="7" fill={MARCA.primario} />
        <circle cx={GAUGE.CX} cy={GAUGE.CY} r="3" fill="white" />

        <text
          x={GAUGE.CX}
          y={GAUGE.CY + 48}
          textAnchor="middle"
          className={tema.text}
          style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {valor != null ? `${(valor * 100).toFixed(1)}%` : "—"}
        </text>
      </svg>

      <div className="flex items-center gap-3 mt-1">
        <span className="text-[11px] font-medium text-slate-500 tabular-nums">
          Meta {(meta * 100).toFixed(2)}%
        </span>
        {valor != null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tema.badge}`}
          >
            {((valor / meta) * 100).toFixed(1)}% de meta
          </span>
        )}
      </div>
    </figure>
  );
}

/* ---------- Trend Chart ---------- */
function TrendChart({ datos, dark = false, fill = false }) {
  if (!datos.length) {
    return (
      <div
        className={`${
          fill ? "h-full" : "h-56"
        } flex items-center justify-center text-sm ${
          dark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        Sin datos de producción en el período
      </div>
    );
  }

  const W = 820, H = 260;
  const PL = 58, PR = 20, PT = 24, PB = 36;
  const AW = W - PL - PR;
  const AH = H - PT - PB;

  const maxValor = Math.max(
    ...datos.map((d) => Math.max(d.metaAcumulada, d.realAcumulado)),
    1
  );
  const maxEscala = maxValor * 1.12;

  const x = (i) =>
    datos.length === 1 ? PL + AW / 2 : PL + (i / (datos.length - 1)) * AW;
  const y = (v) => PT + AH - (v / maxEscala) * AH;

  const pathMeta = datos
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.metaAcumulada)}`)
    .join(" ");
  const pathReal = datos
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.realAcumulado)}`)
    .join(" ");

  const last = datos[datos.length - 1];
  const brecha = last.realAcumulado - last.metaAcumulada;

  const gridColor = dark ? "#334155" : "#f1f5f9";
  const axisTextColor = dark ? "#64748b" : "#94a3b8";
  const realColor = dark ? "#7FA6E0" : MARCA.primario;

  return (
    <div className={`w-full ${fill ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-center justify-between mb-2 text-xs shrink-0">
        <div
          className={`flex items-center gap-5 font-medium ${
            dark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: realColor }}
            />{" "}
            Real
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className={`w-4 h-0.5 rounded ${
                dark ? "bg-slate-500" : "bg-slate-400"
              }`}
            />{" "}
            Meta
          </span>
        </div>
        <span
          className={`font-bold tabular-nums ${
            brecha >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          Brecha acumulada: {brecha >= 0 ? "+" : ""}
          {numero(brecha)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={`w-full ${fill ? "flex-1 min-h-0" : "h-auto"}`}
        role="img"
        aria-label="Producción acumulada vs meta"
      >
        <defs>
          <linearGradient id="areaReal" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={realColor}
              stopOpacity={dark ? 0.25 : 0.12}
            />
            <stop offset="100%" stopColor={realColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }).map((_, i) => {
          const v = (maxEscala / 4) * i;
          const yy = y(v);
          return (
            <g key={i}>
              <line
                x1={PL}
                x2={W - PR}
                y1={yy}
                y2={yy}
                stroke={gridColor}
                strokeWidth="1"
              />
              <text
                x={PL - 10}
                y={yy + 4}
                textAnchor="end"
                fontSize="11"
                fill={axisTextColor}
              >
                {numero(Math.round(v))}
              </text>
            </g>
          );
        })}

        <path
          d={`${pathReal} L ${x(datos.length - 1)} ${PT + AH} L ${x(0)} ${
            PT + AH
          } Z`}
          fill="url(#areaReal)"
        />

        <path
          d={pathMeta}
          fill="none"
          stroke={dark ? "#475569" : "#94a3b8"}
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />

        <path
          d={pathReal}
          fill="none"
          stroke={realColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {datos.map((d, i) => (
          <circle
            key={`r-${d.fecha}`}
            cx={x(i)}
            cy={y(d.realAcumulado)}
            r="3.5"
            fill={realColor}
          />
        ))}

        {datos.map((d, i) => {
          const mostrar = i === 0 || i === datos.length - 1 || i % 5 === 0;
          if (!mostrar) return null;
          return (
            <text
              key={`x-${d.fecha}`}
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {d.dia}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- Safety Banner ---------- */
function SafetyBanner({ anios, dias, dark = false }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        dark
          ? "border-emerald-900 bg-gradient-to-br from-emerald-950 via-slate-800 to-emerald-950"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50"
      }`}
      aria-label="Indicador de seguridad"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-lg shadow-sm">
          🛡️
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
            Seguridad Industrial
          </p>
          <h3
            className={`text-base font-bold ${
              dark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Días sin accidente con tiempo perdido
          </h3>
        </div>
      </div>

      <div className="mt-6 flex items-end gap-4">
        <div>
          <p
            className={`text-6xl font-black tabular-nums leading-none ${
              dark ? "text-emerald-400" : "text-emerald-700"
            }`}
          >
            {anios}
          </p>
          <p
            className={`mt-1 text-xs font-bold uppercase tracking-wider ${
              dark ? "text-emerald-400" : "text-emerald-700"
            }`}
          >
            {anios === 1 ? "Año" : "Años"}
          </p>
        </div>
        {dias > 0 && (
          <div className="pb-1">
            <p
              className={`text-4xl font-black tabular-nums leading-none ${
                dark ? "text-emerald-500" : "text-emerald-600"
              }`}
            >
              +{dias}
            </p>
            <p
              className={`mt-1 text-xs font-bold uppercase tracking-wider ${
                dark ? "text-emerald-500" : "text-emerald-600"
              }`}
            >
              {dias === 1 ? "Día" : "Días"}
            </p>
          </div>
        )}
      </div>

      <p
        className={`mt-4 text-[11px] font-medium ${
          dark ? "text-emerald-500/80" : "text-emerald-700/80"
        }`}
      >
        Record vigente desde el 19 de septiembre de 2023.
      </p>
    </section>
  );
}

/* ---------- Month Selector ---------- */
function MonthSelector({ anio, mes, rango, onChange, onRefresh, loading }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(-1)}
          aria-label="Mes anterior"
          className="h-10 w-10 rounded-lg border transition hover:bg-slate-50 focus:outline-none focus:ring-2"
          style={{ borderColor: MARCA.primarioBorder, color: MARCA.primario }}
        >
          ‹
        </button>

        <div
          className="min-w-[230px] rounded-lg border bg-white px-5 py-1.5 text-center"
          style={{ borderColor: MARCA.primarioBorder }}
        >
          <p
            className="text-base font-bold uppercase tracking-wide"
            style={{ color: MARCA.primario }}
          >
            {MESES[mes]} {anio}
          </p>
          {rango.fin && (
            <p className="text-[11px] text-slate-500 tabular-nums">
              {formatearFecha(rango.inicio)} — {formatearFecha(rango.fin)}
            </p>
          )}
        </div>

        <button
          onClick={() => onChange(1)}
          aria-label="Mes siguiente"
          className="h-10 w-10 rounded-lg border transition hover:bg-slate-50 focus:outline-none focus:ring-2"
          style={{ borderColor: MARCA.primarioBorder, color: MARCA.primario }}
        >
          ›
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Actualizar datos"
          className="ml-2 h-10 rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: MARCA.primario }}
        >
          {loading ? "Actualizando…" : "↻ Actualizar"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Skeleton ---------- */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

function SkeletonDash() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Skeleton className="h-72" />
        <div className="xl:col-span-2">
          <Skeleton className="h-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

/* ---------- Reloj en vivo ---------- */
function RelojEnVivo() {
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hora = ahora.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const fecha = ahora.toLocaleDateString("es-GT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-right">
      <p className="text-3xl font-black tabular-nums leading-none text-white">
        {hora}
      </p>
      <p className="text-[11px] uppercase tracking-widest text-slate-400 mt-1">
        {fecha}
      </p>
    </div>
  );
}

/* =========================================================
   6. HELPERS DE CÁLCULO
========================================================= */

function calcularSeguridad(hoy) {
  const f0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let anios = f0.getFullYear() - FECHA_ULTIMO_CPT.getFullYear();
  let aniv = new Date(
    FECHA_ULTIMO_CPT.getFullYear() + anios,
    FECHA_ULTIMO_CPT.getMonth(),
    FECHA_ULTIMO_CPT.getDate()
  );
  if (f0 < aniv) {
    anios -= 1;
    aniv = new Date(
      FECHA_ULTIMO_CPT.getFullYear() + anios,
      FECHA_ULTIMO_CPT.getMonth(),
      FECHA_ULTIMO_CPT.getDate()
    );
  }
  const dias = Math.floor((f0 - aniv) / 86400000);
  return { anios, dias };
}

function acumularProduccion(produccion) {
  let metaAcum = 0, realAcum = 0;
  return produccion.map((fila) => {
    const meta = Number(fila.meta_carretas) || 0;
    const real = Number(fila.real_carretas) || 0;
    metaAcum += meta;
    realAcum += real;
    const dia = Number(fila.fecha.split("-")[2]) || 0;
    return {
      ...fila,
      dia,
      meta,
      real,
      metaAcumulada: metaAcum,
      realAcumulado: realAcum,
    };
  });
}

function totalProduccion(produccion) {
  return produccion.reduce(
    (acc, f) => {
      acc.meta += Number(f.meta_carretas) || 0;
      acc.real += Number(f.real_carretas) || 0;
      return acc;
    },
    { meta: 0, real: 0 }
  );
}

function produccionUltimoDia(produccionAcumulada) {
  if (!produccionAcumulada.length) {
    return {
      fecha: null,
      dia: null,
      meta: 0,
      real: 0,
      cumplimiento: null,
      brecha: 0,
    };
  }
  const ultimo = produccionAcumulada[produccionAcumulada.length - 1];
  const metaDia = ultimo.meta;
  const realDia = ultimo.real;
  const cumplimientoDia = metaDia > 0 ? realDia / metaDia : null;
  const brechaDia = realDia - metaDia;

  return {
    fecha: ultimo.fecha,
    dia: ultimo.dia,
    meta: metaDia,
    real: realDia,
    cumplimiento: cumplimientoDia,
    brecha: brechaDia,
  };
}

/* =========================================================
   7. COMPONENTES EXCLUSIVOS MODO TV
========================================================= */

/* ---------- KPI grande para TV ---------- */
function KpiTV({ titulo, valor, unidad, estado = "gris" }) {
  const tema = TEMA[estado];
  return (
    <div className={`rounded-2xl border-2 p-5 ${tema.border} ${tema.bg}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
        {titulo}
      </p>
      <p
        className={`text-4xl xl:text-5xl font-black tabular-nums tracking-tight leading-none ${tema.text}`}
      >
        {valor}
      </p>
      {unidad && (
        <p className="mt-2 text-sm font-semibold text-slate-500">{unidad}</p>
      )}
    </div>
  );
}

/* ---------- Sub-KPI grande ---------- */
function SubKpiTV({ titulo, valor, estado = "gris", variacion }) {
  const tema = TEMA[estado];
  const flecha = variacion == null ? null : variacion >= 0 ? "▲" : "▼";
  const colorVar =
    variacion == null
      ? "text-slate-500"
      : variacion >= 0
      ? "text-emerald-500"
      : "text-rose-500";

  return (
    <div
      className={`rounded-2xl border-2 p-6 min-w-[240px] ${tema.border} ${tema.bg}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
        {titulo}
      </p>
      <p
        className={`text-5xl xl:text-6xl font-black tabular-nums leading-none ${tema.text}`}
      >
        {valor}
      </p>
      {variacion != null && (
        <p className={`mt-2 text-sm font-bold ${colorVar}`}>
          {flecha} {(Math.abs(variacion) * 100).toFixed(1)}% vs mes ant.
        </p>
      )}
    </div>
  );
}

/* ---------- Gauge TV que se adapta al contenedor ---------- */
function GaugeTV({ valor, meta }) {
  const clamp = (v) => Math.min(Math.max(v ?? 0, 0), 1);
  const ANGULO = 220;
  const CX = 130, CY = 130, R = 96, GROSOR = 14;

  const polar = (deg) => {
    const rad = ((deg - 90 - 110) * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  };

  const arc = (start, end) => {
    const s = polar(start);
    const e = polar(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const posRojo = clamp(meta * 0.92) * ANGULO;
  const posVerde = clamp(meta * 0.99) * ANGULO;
  const angulo = clamp(valor) * ANGULO;
  const aguja = polar(angulo);

  return (
    <svg
      viewBox="0 0 260 200"
      className="h-full w-full max-h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={arc(0, ANGULO)}
        fill="none"
        stroke="#334155"
        strokeWidth={GROSOR}
        strokeLinecap="round"
      />
      <path
        d={arc(0, posRojo)}
        fill="none"
        stroke="#fb7185"
        strokeWidth={GROSOR}
        strokeLinecap="round"
      />
      <path
        d={arc(posRojo, posVerde)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={GROSOR}
      />
      <path
        d={arc(posVerde, ANGULO)}
        fill="none"
        stroke="#10b981"
        strokeWidth={GROSOR}
        strokeLinecap="round"
      />

      <line
        x1={CX}
        y1={CY}
        x2={aguja.x}
        y2={aguja.y}
        stroke={MARCA.primarioBorder}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r="7" fill={MARCA.primarioBorder} />
      <circle cx={CX} cy={CY} r="3" fill="#0f172a" />

      <text
        x={CX}
        y={CY + 46}
        textAnchor="middle"
        fill="#ffffff"
        style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}
      >
        {valor != null ? `${(valor * 100).toFixed(1)}%` : "—"}
      </text>

      <text
        x={CX}
        y={CY + 68}
        textAnchor="middle"
        fill="#94a3b8"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        Meta {(meta * 100).toFixed(2)}%
      </text>
    </svg>
  );
}

/* =========================================================
   8. PANTALLAS DEL CARRUSEL TV
========================================================= */

/* ---------- PANTALLA 1: SEGURIDAD ---------- */
function PantallaSeguridad({ seguridad }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-4xl shadow-lg">
          🛡️
        </div>
        <div className="text-left">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-400">
            Seguridad Industrial
          </p>
          <p className="text-lg text-slate-300">
            Días sin accidente con tiempo perdido
          </p>
        </div>
      </div>

      <div className="flex items-end justify-center gap-8">
        <div>
          <p className="text-[12rem] xl:text-[16rem] font-black tabular-nums leading-none text-emerald-400">
            {seguridad.anios}
          </p>
          <p className="text-3xl font-bold uppercase tracking-widest text-emerald-500 mt-4">
            {seguridad.anios === 1 ? "Año" : "Años"}
          </p>
        </div>
        {seguridad.dias > 0 && (
          <div className="pb-16">
            <p className="text-[8rem] xl:text-[10rem] font-black tabular-nums leading-none text-emerald-500">
              +{seguridad.dias}
            </p>
            <p className="text-2xl font-bold uppercase tracking-widest text-emerald-600 mt-2">
              {seguridad.dias === 1 ? "Día" : "Días"}
            </p>
          </div>
        )}
      </div>

      <p className="mt-12 text-lg text-emerald-500/80">
        Record vigente desde el 19 de septiembre de 2023
      </p>
    </div>
  );
}

/* ---------- PANTALLA 2: PRODUCCIÓN ---------- */
function PantallaProduccion({
  totalActual,
  cumplimientoProd,
  brechaProd,
  estadoProd,
  ultimoDia,
  estadoUltimoDia,
  produccionAcumulada,
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">
            Producción · Carretas
          </p>
          <h2 className="text-3xl font-black text-white">
            Cumplimiento acumulado del mes
          </h2>
        </div>
        <span
          className={`rounded-full px-5 py-2 text-2xl font-black ${TEMA[estadoProd].badge}`}
        >
          {cumplimientoProd != null
            ? `${(cumplimientoProd * 100).toFixed(1)}%`
            : "—"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiTV
          titulo="Real acumulado"
          valor={numero(totalActual.real)}
          unidad="carretas"
          estado="gris"
        />
        <KpiTV
          titulo="Meta acumulada"
          valor={numero(totalActual.meta)}
          unidad="carretas"
          estado="gris"
        />
        <KpiTV
          titulo="Cumplimiento"
          valor={
            cumplimientoProd != null
              ? `${(cumplimientoProd * 100).toFixed(1)}%`
              : "—"
          }
          estado={estadoProd}
        />
        <KpiTV
          titulo="Brecha"
          valor={
            brechaProd > 0 ? `+${numero(brechaProd)}` : numero(brechaProd)
          }
          unidad="carretas"
          estado={brechaProd >= 0 ? "verde" : "rojo"}
        />
        <KpiTV
          titulo={ultimoDia.dia ? `Día ${ultimoDia.dia} · cierre` : "Último día"}
          valor={
            ultimoDia.cumplimiento != null
              ? `${(ultimoDia.cumplimiento * 100).toFixed(1)}%`
              : "—"
          }
          unidad={
            ultimoDia.real
              ? `${numero(ultimoDia.real)}/${numero(ultimoDia.meta)}`
              : undefined
          }
          estado={estadoUltimoDia}
        />
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-slate-700 bg-slate-800 p-5">
        <TrendChart datos={produccionAcumulada} dark={true} fill />
      </div>
    </div>
  );
}

/* ---------- PANTALLA 3: OEE ---------- */
function PantallaOEE({ oee, estadoOEE, estadoDisp, estadoDes, estadoCal }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">
            Eficiencia global
          </p>
          <h2 className="text-3xl font-black text-white">
            OEE Global · Overall Equipment Effectiveness
          </h2>
        </div>
        <span
          className={`h-4 w-4 rounded-full ${TEMA[estadoOEE].dot}`}
          aria-hidden
        />
      </div>

      <div className="flex flex-1 min-h-0 items-center justify-center gap-16">
        <div className="h-full aspect-square max-h-full">
          <GaugeTV valor={oee.oee} meta={METAS.OEE} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <SubKpiTV
            titulo="Disponibilidad"
            valor={
              oee.disponibilidad != null
                ? `${(oee.disponibilidad * 100).toFixed(1)}%`
                : "—"
            }
            estado={estadoDisp}
            variacion={oee.tendencia.disponibilidad}
          />
          <SubKpiTV
            titulo="Desempeño"
            valor={
              oee.desempeno != null
                ? `${(oee.desempeno * 100).toFixed(1)}%`
                : "—"
            }
            estado={estadoDes}
            variacion={oee.tendencia.desempeno}
          />
          <SubKpiTV
            titulo="Calidad"
            valor={
              oee.calidad != null
                ? `${(oee.calidad * 100).toFixed(1)}%`
                : "—"
            }
            estado={estadoCal}
            variacion={oee.tendencia.calidad}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- PANTALLA 4: DISPONIBILIDAD ---------- */
function PantallaDisponibilidad({ oee, estadoDisp }) {
  const lectura =
    oee.disponibilidad == null
      ? "Sin información suficiente para evaluar la disponibilidad del período."
      : oee.disponibilidad >= METAS.DISPONIBILIDAD
      ? "La planta opera dentro del estándar de confiabilidad definido por la dirección."
      : oee.disponibilidad >= METAS.DISPONIBILIDAD * 0.98
      ? "Desempeño cercano a la meta. Vigilar paros no planeados recurrentes."
      : "Por debajo de la meta: revisar plan de mantenimiento y causas de paro.";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">
            Mantenimiento
          </p>
          <h2 className="text-3xl font-black text-white">
            Disponibilidad Operativa
          </h2>
        </div>
        <span
          className={`h-4 w-4 rounded-full ${TEMA[estadoDisp].dot}`}
          aria-hidden
        />
      </div>

      <div className="flex flex-1 min-h-0 items-center gap-16">
        <div className="h-full aspect-square max-h-full">
          <GaugeTV valor={oee.disponibilidad} meta={METAS.DISPONIBILIDAD} />
        </div>

        <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 mb-4">
            Lectura ejecutiva
          </p>
          <p className="text-3xl font-semibold leading-snug text-slate-100">
            {lectura}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <SubKpiTV
              titulo="Meta"
              valor={`${(METAS.DISPONIBILIDAD * 100).toFixed(2)}%`}
              estado="gris"
            />
            <SubKpiTV
              titulo="Actual"
              valor={
                oee.disponibilidad != null
                  ? `${(oee.disponibilidad * 100).toFixed(2)}%`
                  : "—"
              }
              estado={estadoDisp}
            />
            <SubKpiTV
              titulo="Tendencia"
              valor={
                oee.tendencia.disponibilidad != null
                  ? `${oee.tendencia.disponibilidad >= 0 ? "+" : ""}${(
                      oee.tendencia.disponibilidad * 100
                    ).toFixed(1)}%`
                  : "—"
              }
              estado={
                oee.tendencia.disponibilidad == null
                  ? "gris"
                  : oee.tendencia.disponibilidad >= 0
                  ? "verde"
                  : "rojo"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   9. DASHBOARD PRINCIPAL
========================================================= */

export default function Dashboard() {
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [modoTV, setModoTV] = useState(false);
  const [pantalla, setPantalla] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [controlesVisibles, setControlesVisibles] = useState(true);

  const DURACION = 10000;
  const TOTAL_PANTALLAS = 4;

  useModoTV(modoTV);

  const {
    rango,
    registros,
    produccion,
    registrosPrev,
    produccionPrev,
    loading,
    error,
    recargar,
  } = useDashboardData(anio, mes);

  useAutoRefresh(modoTV, recargar, 300000);

  const oee = useOEE(registros, registrosPrev);

  const produccionAcumulada = useMemo(
    () => acumularProduccion(produccion),
    [produccion]
  );
  const totalActual = useMemo(() => totalProduccion(produccion), [produccion]);
  const totalPrev = useMemo(
    () => totalProduccion(produccionPrev),
    [produccionPrev]
  );

  const cumplimientoProd = cumplimiento(totalActual.real, totalActual.meta);
  const tendenciaProd = variacion(totalActual.real, totalPrev.real);
  const brechaProd = totalActual.real - totalActual.meta;

  const ultimoDia = useMemo(
    () => produccionUltimoDia(produccionAcumulada),
    [produccionAcumulada]
  );

  const estadoUltimoDia =
    ultimoDia.cumplimiento == null
      ? "gris"
      : ultimoDia.cumplimiento >= 1
      ? "verde"
      : ultimoDia.cumplimiento >= 0.95
      ? "amarillo"
      : "rojo";

  const seguridad = useMemo(() => calcularSeguridad(hoy), [hoy]);

  const estadoProd =
    cumplimientoProd == null
      ? "gris"
      : cumplimientoProd >= 1
      ? "verde"
      : cumplimientoProd >= 0.95
      ? "amarillo"
      : "rojo";

  const estadoOEE = estadoKPI(oee.oee, METAS.OEE);
  const estadoDisp = estadoKPI(oee.disponibilidad, METAS.DISPONIBILIDAD);
  const estadoCal = estadoKPI(oee.calidad, METAS.CALIDAD);
  const estadoDes = estadoKPI(oee.desempeno, METAS.DESEMPENO);

  const cambiarMes = (delta) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  };

  const sinDatos = !rango.fin;

  /* Rotación automática */
  useEffect(() => {
    if (!modoTV || pausado) return;
    const id = setInterval(() => {
      setPantalla((p) => (p + 1) % TOTAL_PANTALLAS);
    }, DURACION);
    return () => clearInterval(id);
  }, [modoTV, pausado]);

  /* Ocultar controles tras 4s de inactividad */
  useEffect(() => {
    if (!modoTV) return;
    let timer;
    const resetear = () => {
      setControlesVisibles(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlesVisibles(false), 4000);
    };
    resetear();
    window.addEventListener("mousemove", resetear);
    return () => {
      window.removeEventListener("mousemove", resetear);
      clearTimeout(timer);
    };
  }, [modoTV]);

  /* Atajos de teclado */
  useEffect(() => {
    if (!modoTV) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModoTV(false);
      if (e.key === "ArrowRight")
        setPantalla((p) => (p + 1) % TOTAL_PANTALLAS);
      if (e.key === "ArrowLeft")
        setPantalla((p) => (p - 1 + TOTAL_PANTALLAS) % TOTAL_PANTALLAS);
      if (e.key === " ") {
        e.preventDefault();
        setPausado((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modoTV]);

  /* =========================================================
     MODO NORMAL
  ========================================================= */
  if (!modoTV) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ backgroundColor: MARCA.primario }}
              >
                <span className="text-xl font-black">◈</span>
              </div>
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: MARCA.primario }}
                >
                  Grupo AG · División Industrial
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
                  Dashboard Planta Transmetal
                </h1>
                <p className="text-sm text-slate-500">
                  Seguridad · Producción · Eficiencia global de equipos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MonthSelector
                anio={anio}
                mes={mes}
                rango={rango}
                onChange={cambiarMes}
                onRefresh={recargar}
                loading={loading}
              />
              <button
                onClick={() => {
                  setModoTV(true);
                  setPantalla(0);
                }}
                aria-label="Activar modo TV rotativo"
                className="ml-1 h-10 rounded-lg px-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: MARCA.primario }}
              >
                📺 Modo TV
              </button>
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          {loading && !error && <SkeletonDash />}

          {!loading && sinDatos && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-base font-semibold text-slate-700">
                {rango.futuro
                  ? "El período seleccionado aún no ha ocurrido."
                  : "Aún no hay días cerrados para este mes."}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona otro mes o vuelve al período actual.
              </p>
            </div>
          )}

          {!loading && !sinDatos && (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <SafetyBanner
                  anios={seguridad.anios}
                  dias={seguridad.dias}
                  dark={false}
                />

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Producción · Carretas
                      </p>
                      <h2 className="text-xl font-black text-slate-900">
                        Cumplimiento acumulado del mes
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${TEMA[estadoProd].badge}`}
                    >
                      {cumplimientoProd != null
                        ? `${(cumplimientoProd * 100).toFixed(1)}% cumplimiento`
                        : "Sin datos"}
                    </span>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <KpiCard
                      titulo="Real acumulado"
                      valor={numero(totalActual.real)}
                      unidad="carr."
                      variacion={tendenciaProd}
                      estado="gris"
                    />
                    <KpiCard
                      titulo="Meta acumulada"
                      valor={numero(totalActual.meta)}
                      unidad="carr."
                      estado="gris"
                    />
                    <KpiCard
                      titulo="Cumplimiento"
                      valor={
                        cumplimientoProd != null
                          ? `${(cumplimientoProd * 100).toFixed(1)}%`
                          : "—"
                      }
                      estado={estadoProd}
                      destacado
                    />
                    <KpiCard
                      titulo="Brecha"
                      valor={
                        brechaProd > 0
                          ? `+${numero(brechaProd)}`
                          : numero(brechaProd)
                      }
                      unidad="carr."
                      estado={brechaProd >= 0 ? "verde" : "rojo"}
                    />
                    <KpiCard
                      titulo={
                        ultimoDia.dia
                          ? `Día ${ultimoDia.dia} (últ. cierre)`
                          : "Último día"
                      }
                      valor={
                        ultimoDia.cumplimiento != null
                          ? `${(ultimoDia.cumplimiento * 100).toFixed(1)}%`
                          : "—"
                      }
                      unidad={
                        ultimoDia.real
                          ? `${numero(ultimoDia.real)}/${numero(ultimoDia.meta)}`
                          : undefined
                      }
                      estado={estadoUltimoDia}
                      destacado
                    />
                  </div>

                  {ultimoDia.fecha && (
                    <div
                      className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${TEMA[estadoUltimoDia].border} ${TEMA[estadoUltimoDia].bg}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2 w-2 rounded-full ${TEMA[estadoUltimoDia].dot}`}
                        />
                        <p className="text-sm font-semibold text-slate-700">
                          Cierre del {formatearFecha(ultimoDia.fecha)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm tabular-nums">
                        <span className="text-slate-600">
                          Real:{" "}
                          <b className="text-slate-900">
                            {numero(ultimoDia.real)}
                          </b>{" "}
                          carr.
                        </span>
                        <span className="text-slate-600">
                          Meta:{" "}
                          <b className="text-slate-900">
                            {numero(ultimoDia.meta)}
                          </b>{" "}
                          carr.
                        </span>
                        <span className="text-slate-600">
                          Cumplimiento:{" "}
                          <b className={TEMA[estadoUltimoDia].text}>
                            {ultimoDia.cumplimiento != null
                              ? `${(ultimoDia.cumplimiento * 100).toFixed(1)}%`
                              : "—"}
                          </b>
                        </span>
                        <span className="text-slate-600">
                          Brecha:{" "}
                          <b
                            className={
                              ultimoDia.brecha >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }
                          >
                            {ultimoDia.brecha >= 0 ? "+" : ""}
                            {numero(ultimoDia.brecha)}
                          </b>
                        </span>
                      </div>
                    </div>
                  )}

                  <TrendChart datos={produccionAcumulada} dark={false} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section
                  className={`rounded-2xl border bg-white p-6 shadow-sm ${TEMA[estadoOEE].border}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Eficiencia global
                      </p>
                      <h2 className="text-xl font-black text-slate-900">
                        OEE Global
                      </h2>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${TEMA[estadoOEE].dot}`}
                      aria-hidden
                    />
                  </div>

                  <Gauge
                    valor={oee.oee}
                    meta={METAS.OEE}
                    titulo="Overall Equipment Effectiveness"
                    subtitulo="Disponibilidad × Desempeño × Calidad"
                  />

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <KpiCard
                      titulo="Disponibilidad"
                      valor={
                        oee.disponibilidad != null
                          ? `${(oee.disponibilidad * 100).toFixed(1)}%`
                          : "—"
                      }
                      variacion={oee.tendencia.disponibilidad}
                      estado={estadoDisp}
                    />
                    <KpiCard
                      titulo="Desempeño"
                      valor={
                        oee.desempeno != null
                          ? `${(oee.desempeno * 100).toFixed(1)}%`
                          : "—"
                      }
                      variacion={oee.tendencia.desempeno}
                      estado={estadoDes}
                    />
                    <KpiCard
                      titulo="Calidad"
                      valor={
                        oee.calidad != null
                          ? `${(oee.calidad * 100).toFixed(1)}%`
                          : "—"
                      }
                      variacion={oee.tendencia.calidad}
                      estado={estadoCal}
                    />
                  </div>
                </section>

                <section
                  className={`rounded-2xl border bg-white p-6 shadow-sm ${TEMA[estadoDisp].border}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Mantenimiento
                      </p>
                      <h2 className="text-xl font-black text-slate-900">
                        Disponibilidad Operativa
                      </h2>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${TEMA[estadoDisp].dot}`}
                      aria-hidden
                    />
                  </div>

                  <Gauge
                    valor={oee.disponibilidad}
                    meta={METAS.DISPONIBILIDAD}
                    titulo="Tiempo operativo vs programado"
                    subtitulo="Indicador clave de confiabilidad"
                  />

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Lectura ejecutiva
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {oee.disponibilidad == null
                        ? "Sin información suficiente para evaluar la disponibilidad del período."
                        : oee.disponibilidad >= METAS.DISPONIBILIDAD
                        ? "La planta opera dentro del estándar de confiabilidad definido por la dirección."
                        : oee.disponibilidad >= METAS.DISPONIBILIDAD * 0.98
                        ? "Desempeño cercano a la meta. Vigilar paros no planeados recurrentes."
                        : "Por debajo de la meta: revisar plan de mantenimiento y causas de paro."}
                    </p>
                  </div>
                </section>
              </div>

              <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
                <span>
                  Metas: OEE {(METAS.OEE * 100).toFixed(2)}% · Disponibilidad{" "}
                  {(METAS.DISPONIBILIDAD * 100).toFixed(2)}% · Calidad{" "}
                  {(METAS.CALIDAD * 100).toFixed(2)}% · Desempeño{" "}
                  {(METAS.DESEMPENO * 100).toFixed(2)}%
                </span>
                {rango.fin && (
                  <span className="tabular-nums">
                    Información validada al {formatearFecha(rango.fin)}
                  </span>
                )}
              </footer>
            </>
          )}
        </div>
      </main>
    );
  }

  /* =========================================================
     MODO TV — CARRUSEL DE PANTALLAS COMPLETAS
  ========================================================= */
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white">
      {/* Barra de progreso superior */}
      {!pausado && (
        <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-slate-800">
          <div
            key={pantalla}
            className="h-full"
            style={{
              backgroundColor: MARCA.primario,
              animation: `progreso ${DURACION}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Header fijo */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: MARCA.primario }}
          >
            <span className="text-lg font-black">◈</span>
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: MARCA.primarioBorder }}
            >
              Grupo AG · Planta Transmetal
            </p>
            <p className="text-xs text-slate-400">
              {MESES[mes]} {anio} · {formatearFecha(rango.inicio)} —{" "}
              {formatearFecha(rango.fin)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <RelojEnVivo />
        </div>
      </header>

      {/* Contenido rotativo */}
      <div className="absolute inset-0 flex items-center justify-center px-16 pt-24 pb-24">
        {loading ? (
          <p className="text-slate-400 text-2xl">Cargando datos…</p>
        ) : sinDatos ? (
          <p className="text-slate-400 text-2xl text-center">
            {rango.futuro
              ? "El período seleccionado aún no ha ocurrido."
              : "Aún no hay días cerrados para este mes."}
          </p>
        ) : (
          <div
            key={pantalla}
            className="h-full w-full"
            style={{ animation: "fadeIn 600ms ease-out" }}
          >
            {pantalla === 0 && <PantallaSeguridad seguridad={seguridad} />}
            {pantalla === 1 && (
              <PantallaProduccion
                totalActual={totalActual}
                cumplimientoProd={cumplimientoProd}
                brechaProd={brechaProd}
                estadoProd={estadoProd}
                ultimoDia={ultimoDia}
                estadoUltimoDia={estadoUltimoDia}
                produccionAcumulada={produccionAcumulada}
              />
            )}
            {pantalla === 2 && (
              <PantallaOEE
                oee={oee}
                estadoOEE={estadoOEE}
                estadoDisp={estadoDisp}
                estadoDes={estadoDes}
                estadoCal={estadoCal}
              />
            )}
            {pantalla === 3 && (
              <PantallaDisponibilidad oee={oee} estadoDisp={estadoDisp} />
            )}
          </div>
        )}
      </div>

      {/* Controles inferiores */}
      <div
        className={`absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-700 bg-slate-800/90 px-5 py-2 backdrop-blur transition-opacity duration-500 ${
          controlesVisibles ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={() =>
            setPantalla((p) => (p - 1 + TOTAL_PANTALLAS) % TOTAL_PANTALLAS)
          }
          aria-label="Pantalla anterior"
          className="text-slate-300 hover:text-white text-lg"
        >
          ◀
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_PANTALLAS }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPantalla(i)}
              aria-label={`Ir a pantalla ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === pantalla
                  ? "w-8 bg-white"
                  : "w-2 bg-slate-500 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setPausado((p) => !p)}
          aria-label={pausado ? "Reanudar rotación" : "Pausar rotación"}
          className="text-slate-300 hover:text-white text-sm"
        >
          {pausado ? "▶" : "⏸"}
        </button>

        <button
          onClick={() => setPantalla((p) => (p + 1) % TOTAL_PANTALLAS)}
          aria-label="Pantalla siguiente"
          className="text-slate-300 hover:text-white text-lg"
        >
          ▶
        </button>

        <div className="mx-2 h-5 w-px bg-slate-600" />

        <button
          onClick={() => setModoTV(false)}
          aria-label="Salir de modo TV"
          className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300"
        >
          ✕ Salir
        </button>
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes progreso {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
