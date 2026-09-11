/* =========================================================
   DASHBOARD PLANTA TRANSMETAL
   Grupo AG · División Industrial
   Versión Senior — Enfoque industrial / directivo
========================================================= */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  acento: "#F5C518",
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
   TEMA MODO TV — CLARO CORPORATIVO GRUPO AG
========================================================= */

const TV = Object.freeze({
  bg: "#F5F8FC",
  bgGrad: "linear-gradient(135deg, #F5F8FC 0%, #E6EDF9 50%, #F5F8FC 100%)",
  headerBg: "#003DA5",
  headerText: "#FFFFFF",
  acento: "#F5C518",
  panel: "#FFFFFF",
  panelBorder: "#B3C7E6",
  textoPrimario: "#001F4D",
  textoSecundario: "#64748B",
  textoMuted: "#94A3B8",
});

const TEMA_TV = Object.freeze({
  verde: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  amarillo: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  rojo: {
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-300",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  gris: {
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-300",
    badge: "bg-slate-100 text-slate-700",
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
  const partes = f.split("-");
  if (partes.length !== 3) return "—";
  const [a, m, d] = partes;
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
   CACHE OFFLINE DEL DASHBOARD
   Conserva el último estado válido por período seleccionado.
========================================================= */

const DASHBOARD_CACHE_VERSION = 1;
const DASHBOARD_CACHE_PREFIX = `transmetal_dashboard_v${DASHBOARD_CACHE_VERSION}`;

function dashboardCacheKey(anio, mes, diaSeleccionado) {
  const vista = diaSeleccionado == null ? "mes" : `dia-${pad(diaSeleccionado)}`;
  return `${DASHBOARD_CACHE_PREFIX}:${anio}-${pad(mes + 1)}:${vista}`;
}

function leerDashboardCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    return parsed;
  } catch (err) {
    console.warn("No fue posible leer el caché del Dashboard:", err);
    return null;
  }
}

function guardarDashboardCache(key, data) {
  try {
    const guardadoEn = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify({ data, guardadoEn }));
    return guardadoEn;
  } catch (err) {
    console.warn("No fue posible guardar el caché del Dashboard:", err);
    return null;
  }
}

function formatearFechaHoraCache(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

const CATALOGO_MAP = buildCatalogoMap();

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
  if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fin)) return null;

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

/* OEE agregado por tiempos (no promedio de ratios) */
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

function useDashboardData(anio, mes, diaSeleccionado = null) {
  const hoy = useMemo(() => new Date(), []);

  const rango = useMemo(() => {
    const base = calcularRango(anio, mes, hoy);
    if (base.fin && diaSeleccionado) {
      const diaMax = Number(base.fin.split("-")[2]);
      const dia = Math.min(Math.max(diaSeleccionado, 1), diaMax);
      return { ...base, fin: fechaISO(anio, mes, dia) };
    }
    return base;
  }, [anio, mes, hoy, diaSeleccionado]);

  const rangoPrev = useMemo(() => rangoMesAnterior(anio, mes), [anio, mes]);
  const cacheKey = useMemo(
    () => dashboardCacheKey(anio, mes, diaSeleccionado),
    [anio, mes, diaSeleccionado]
  );

  const vacio = useMemo(
    () => ({
      registros: [],
      produccion: [],
      registrosPrev: [],
      produccionPrev: [],
    }),
    []
  );

  const [data, setData] = useState(vacio);
  const [estado, setEstado] = useState({
    loading: true,
    error: null,
    sinConexion: false,
    ultimaActualizacion: null,
    usandoCache: false,
  });

  const cargar = useCallback(async () => {
    if (!rango.fin) {
      setData(vacio);
      setEstado({
        loading: false,
        error: null,
        sinConexion: false,
        ultimaActualizacion: null,
        usandoCache: false,
      });
      return;
    }

    // Al entrar a un período, primero mostramos su último estado guardado.
    // Así la TV nunca queda vacía solo porque Internet no esté disponible.
    const cache = leerDashboardCache(cacheKey);
    if (cache?.data) {
      setData(cache.data);
      setEstado({
        loading: false,
        error: null,
        sinConexion: !navigator.onLine,
        ultimaActualizacion: cache.guardadoEn || null,
        usandoCache: true,
      });
    } else {
      setData(vacio);
      setEstado({
        loading: true,
        error: null,
        sinConexion: !navigator.onLine,
        ultimaActualizacion: null,
        usandoCache: false,
      });
    }

    try {
      const [reg, prod, regPrev, prodPrev] = await Promise.all([
        supabase
          .from("registros")
          .select("*")
          .gte("fecha", rango.inicio)
          .lte("fecha", rango.fin)
          .order("fecha", { ascending: true }),
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

      const respuestas = [reg, prod, regPrev, prodPrev];
      const errores = respuestas.filter((r) => r.error);

      if (errores.length === 4) {
        console.error("Sin conexión / errores Supabase:", errores.map((e) => e.error));
        setEstado((prev) => ({
          ...prev,
          loading: false,
          sinConexion: true,
          usandoCache: !!cache?.data,
          error: cache?.data
            ? null
            : "Sin conexión y todavía no hay información guardada para este período.",
        }));
        return;
      }

      // Si una consulta aislada falla, conservamos esa sección desde el caché
      // en vez de sustituirla por un arreglo vacío.
      const base = cache?.data || vacio;
      const nuevoData = {
        registros: reg.error ? base.registros : reg.data || [],
        produccion: prod.error ? base.produccion : prod.data || [],
        registrosPrev: regPrev.error ? base.registrosPrev : regPrev.data || [],
        produccionPrev: prodPrev.error
          ? base.produccionPrev
          : prodPrev.data || [],
      };

      setData(nuevoData);
      const guardadoEn = guardarDashboardCache(cacheKey, nuevoData);

      setEstado({
        loading: false,
        error: errores.length
          ? "Algunos datos no pudieron actualizarse; se conserva la última información disponible en esas secciones."
          : null,
        sinConexion: false,
        ultimaActualizacion: guardadoEn || cache?.guardadoEn || null,
        usandoCache: errores.length > 0,
      });
    } catch (err) {
      console.error("Error de conexión al cargar Dashboard:", err);
      setEstado((prev) => ({
        ...prev,
        loading: false,
        sinConexion: true,
        usandoCache: !!cache?.data,
        error: cache?.data
          ? null
          : "Sin conexión y todavía no hay información guardada para este período.",
      }));
    }
  }, [rango, rangoPrev, cacheKey, vacio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Si vuelve Internet, intentamos actualizar inmediatamente sin esperar
  // al siguiente ciclo de auto-refresh.
  useEffect(() => {
    const alVolverInternet = () => cargar();
    window.addEventListener("online", alVolverInternet);
    return () => window.removeEventListener("online", alVolverInternet);
  }, [cargar]);

  return { rango, ...data, ...estado, recargar: cargar };
}

function useOEE(registros, registrosPrev = []) {
  return useMemo(() => {
    const actuales = registros
      .map((r) => calcularTiempos(r, CATALOGO_MAP))
      .filter(Boolean);
    const anteriores = registrosPrev
      .map((r) => calcularTiempos(r, CATALOGO_MAP))
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
  }, [registros, registrosPrev]);
}

function useAutoRefresh(activo, callback, intervaloMs = 300000) {
  const cbRef = React.useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => cbRef.current(), intervaloMs);
    return () => clearInterval(id);
  }, [activo, intervaloMs]);
}

/* =========================================================
   5. COMPONENTES UI (modo normal)
========================================================= */

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

      <p
        className={`mt-1.5 text-2xl font-black tabular-nums tracking-tight ${tema.text}`}
      >
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
  const posRojo = 0.92 * GAUGE.ANGULO;
  const posVerde = 0.99 * GAUGE.ANGULO;
  const cump = valor == null ? 0 : clamp(valor / meta);
  const angulo = cump * GAUGE.ANGULO;
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

  const gridColor = "#f1f5f9";
  const axisTextColor = "#94a3b8";
  const realColor = MARCA.primario;

  return (
    <div className={`w-full ${fill ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-center justify-between mb-2 text-xs shrink-0">
        <div className="flex items-center gap-5 font-medium text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: realColor }}
            />{" "}
            Real
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 rounded bg-slate-400" /> Meta
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
            <stop offset="0%" stopColor={realColor} stopOpacity="0.12" />
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
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="8 6"
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
            key={`r-${d.fecha}-${i}`}
            cx={x(i)}
            cy={y(d.realAcumulado)}
            r="3.5"
            fill={realColor}
          />
        ))}

        {datos.map((d, i) => {
          const paso = datos.length <= 10 ? 2 : 5;
          const mostrar = i === 0 || i === datos.length - 1 || i % paso === 0;
          if (!mostrar) return null;
          return (
            <text
              key={`x-${d.fecha}-${i}`}
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

/* ---------- Safety Banner (modo normal) ---------- */
function SafetyBanner({ anios, dias, dark = false }) {
  return (
    <section
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-7 ${
        dark
          ? "border-emerald-900 bg-gradient-to-br from-emerald-950 via-slate-800 to-emerald-950"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50"
      }`}
      aria-label="Tiempo sin Accidentes CPT"
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
            Tiempo sin Accidentes CPT
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-3">
        <p
          className={`text-[9rem] sm:text-[11rem] xl:text-[13rem] font-black tabular-nums leading-[0.85] ${
            dark ? "text-emerald-400" : "text-emerald-700"
          }`}
        >
          {anios}
        </p>
        <p
          className={`text-sm sm:text-base font-bold uppercase tracking-[0.3em] ${
            dark ? "text-emerald-400" : "text-emerald-700"
          }`}
        >
          {anios === 1 ? "Año" : "Años"}
        </p>

        {dias > 0 && (
          <>
            <p
              className={`mt-2 text-5xl sm:text-6xl xl:text-7xl font-black tabular-nums leading-none ${
                dark ? "text-emerald-500" : "text-emerald-600"
              }`}
            >
              +{dias}
            </p>
            <p
              className={`mt-1 text-xs font-bold uppercase tracking-[0.3em] ${
                dark ? "text-emerald-500" : "text-emerald-600"
              }`}
            >
              {dias === 1 ? "Día" : "Días"}
            </p>
          </>
        )}
      </div>

      <p
        className={`text-center text-[11px] font-medium ${
          dark ? "text-emerald-500/80" : "text-emerald-700/80"
        }`}
      >
        Record vigente desde el 19 de septiembre de 2023
      </p>
    </section>
  );
}

function MonthSelector({ anio, mes, rango, onChange, onRefresh, loading }) {
  return (
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
        className="min-w-[180px] rounded-lg border bg-white px-4 py-1.5 text-center"
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
        aria-label={loading ? "Cargando datos" : "Actualizar datos"}
        className="ml-1 h-10 rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-
