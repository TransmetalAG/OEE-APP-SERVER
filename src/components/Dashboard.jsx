import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { catalogo } from "../data/catalogo";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const META_OEE = 0.6557;
const META_DISPONIBILIDAD = 0.97;

const FECHA_ULTIMO_CPT = new Date(2023, 8, 19); // 19/09/2023

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/* =========================================================
   HELPERS
========================================================= */

const normalize = (txt) =>
  txt
    ? txt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";

const pad = (n) => String(n).padStart(2, "0");

const fechaISO = (anio, mes, dia) =>
  `${anio}-${pad(mes + 1)}-${pad(dia)}`;

const formatearFecha = (fecha) => {
  if (!fecha) return "—";

  const [anio, mes, dia] = fecha.split("-");

  return `${dia}/${mes}/${anio}`;
};

const diasEnMes = (anio, mes) =>
  new Date(anio, mes + 1, 0).getDate();

const pct = (valor) =>
  valor == null ? "—" : `${(valor * 100).toFixed(1)}%`;

const numero = (valor) =>
  Number(valor || 0).toLocaleString("es-GT");

/* =========================================================
   COLORES SEGÚN CUMPLIMIENTO
========================================================= */

function estadoKPI(valor, meta) {
  if (valor == null) return "gris";

  const cumplimiento = valor / meta;

  if (cumplimiento >= 0.99) return "verde";
  if (cumplimiento >= 0.92) return "amarillo";

  return "rojo";
}

const ESTILOS = {
  verde: {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },

  amarillo: {
    text: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },

  rojo: {
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },

  gris: {
    text: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
};

/* =========================================================
   VELOCÍMETRO
========================================================= */

function Velocimetro({ valor, meta, titulo }) {
  const estado = estadoKPI(valor, meta);

  const ANGULO_TOTAL = 220;

  const cx = 120;
  const cy = 120;
  const r = 90;
  const grosor = 16;

  const limiteRojo = meta * 0.92;
  const limiteVerde = meta * 0.99;

  const posicionRojo =
    Math.min(Math.max(limiteRojo, 0), 1) * ANGULO_TOTAL;

  const posicionVerde =
    Math.min(Math.max(limiteVerde, 0), 1) * ANGULO_TOTAL;

  const angulo =
    Math.min(Math.max(valor ?? 0, 0), 1) * ANGULO_TOTAL;

  const polar = (deg) => {
    const rad = ((deg - 90 - 110) * Math.PI) / 180;

    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const arcPath = (start, end) => {
    const s = polar(start);
    const e = polar(end);

    const large = end - start > 180 ? 1 : 0;

    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const aguja = polar(angulo);

  return (
    <div className="flex flex-col items-center">

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-1">
        {titulo}
      </p>

      <svg
        viewBox="0 0 240 175"
        className="w-full max-w-[260px]"
      >

        {/* Fondo */}
        <path
          d={arcPath(0, ANGULO_TOTAL)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={grosor}
          strokeLinecap="round"
        />

        {/* Rojo */}
        <path
          d={arcPath(0, posicionRojo)}
          fill="none"
          stroke="#fb7185"
          strokeWidth={grosor}
          strokeLinecap="round"
        />

        {/* Amarillo */}
        <path
          d={arcPath(posicionRojo, posicionVerde)}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={grosor}
        />

        {/* Verde */}
        <path
          d={arcPath(posicionVerde, ANGULO_TOTAL)}
          fill="none"
          stroke="#10b981"
          strokeWidth={grosor}
          strokeLinecap="round"
        />

        {/* Aguja */}
        <line
          x1={cx}
          y1={cy}
          x2={aguja.x}
          y2={aguja.y}
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle
          cx={cx}
          cy={cy}
          r="7"
          fill="#0f172a"
        />

        <circle
          cx={cx}
          cy={cy}
          r="3"
          fill="white"
        />

        <text
          x={cx}
          y={cy + 43}
          textAnchor="middle"
          fill="currentColor"
          className={ESTILOS[estado].text}
          style={{
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          {valor != null
            ? `${(valor * 100).toFixed(1)}%`
            : "—"}
        </text>
      </svg>

      <div className="flex items-center gap-3 -mt-2">

        <span className="text-xs text-slate-500">
          Meta {(meta * 100).toFixed(2)}%
        </span>

        {valor != null && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTILOS[estado].badge}`}
          >
            {((valor / meta) * 100).toFixed(1)}% de meta
          </span>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   GRÁFICA PRODUCCIÓN ACUMULADA
   SVG PURO - SIN LIBRERÍAS ADICIONALES
========================================================= */

function GraficaProduccion({ datos }) {
  if (!datos.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        Sin datos de producción
      </div>
    );
  }

  const width = 800;
  const height = 280;

  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const anchoUtil =
    width - paddingLeft - paddingRight;

  const altoUtil =
    height - paddingTop - paddingBottom;

  const maxValor = Math.max(
    ...datos.map((d) =>
      Math.max(d.metaAcumulada, d.realAcumulado)
    ),
    1
  );

  const maxEscala = maxValor * 1.12;

  const x = (index) => {
    if (datos.length === 1) {
      return paddingLeft + anchoUtil / 2;
    }

    return (
      paddingLeft +
      (index / (datos.length - 1)) * anchoUtil
    );
  };

  const y = (valor) =>
    paddingTop +
    altoUtil -
    (valor / maxEscala) * altoUtil;

  const puntosMeta = datos
    .map(
      (d, i) =>
        `${x(i)},${y(d.metaAcumulada)}`
    )
    .join(" ");

  const puntosReal = datos
    .map(
      (d, i) =>
        `${x(i)},${y(d.realAcumulado)}`
    )
    .join(" ");

  const lineas = 4;

  return (
    <div className="w-full">

      <div className="flex items-center justify-center gap-6 mb-1 text-xs font-medium">

        <div className="flex items-center gap-2">
          <span className="w-4 h-1 rounded bg-blue-500" />
          <span className="text-slate-600">
            Real acumulado
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-4 h-1 rounded bg-slate-400" />
          <span className="text-slate-600">
            Meta acumulada
          </span>
        </div>

      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
      >

        {/* Líneas horizontales */}
        {Array.from({ length: lineas + 1 }).map(
          (_, i) => {
            const valor =
              (maxEscala / lineas) * i;

            const posY = y(valor);

            return (
              <g key={i}>

                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={posY}
                  y2={posY}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />

                <text
                  x={paddingLeft - 10}
                  y={posY + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  {Math.round(valor)}
                </text>

              </g>
            );
          }
        )}

        {/* Meta */}
        <polyline
          points={puntosMeta}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Real */}
        <polyline
          points={puntosReal}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Puntos */}
        {datos.map((d, i) => (
          <g key={d.fecha}>

            <circle
              cx={x(i)}
              cy={y(d.metaAcumulada)}
              r="4"
              fill="#94a3b8"
            />

            <circle
              cx={x(i)}
              cy={y(d.realAcumulado)}
              r="5"
              fill="#3b82f6"
            />

            {(i === 0 ||
              i === datos.length - 1 ||
              i % 4 === 0) && (
              <text
                x={x(i)}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {d.dia}
              </text>
            )}

          </g>
        ))}

      </svg>

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const hoy = useMemo(() => new Date(), []);

  const [anio, setAnio] = useState(
    hoy.getFullYear()
  );

  const [mes, setMes] = useState(
    hoy.getMonth()
  );

  const [registros, setRegistros] = useState([]);
  const [produccion, setProduccion] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     RANGO DEL DASHBOARD
  ======================================================= */

  const rango = useMemo(() => {
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth();

    const seleccionado =
      anio * 12 + mes;

    const actual =
      anioActual * 12 + mesActual;

    const inicio = fechaISO(anio, mes, 1);

    /* MES FUTURO */
    if (seleccionado > actual) {
      return {
        inicio,
        fin: null,
        futuro: true,
      };
    }

    /* MES ACTUAL → HASTA AYER */
    if (seleccionado === actual) {
      const ayer = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() - 1
      );

      /*
        Si hoy es día 1, ayer pertenece
        al mes anterior.
      */
      if (
        ayer.getMonth() !== mes ||
        ayer.getFullYear() !== anio
      ) {
        return {
          inicio,
          fin: null,
          futuro: false,
          sinDiasCerrados: true,
        };
      }

      return {
        inicio,
        fin: fechaISO(
          ayer.getFullYear(),
          ayer.getMonth(),
          ayer.getDate()
        ),
        futuro: false,
      };
    }

    /* MES CERRADO → HASTA ÚLTIMO DÍA */
    return {
      inicio,
      fin: fechaISO(
        anio,
        mes,
        diasEnMes(anio, mes)
      ),
      futuro: false,
    };
  }, [anio, mes, hoy]);

  /* =======================================================
     CATÁLOGO DE VELOCIDADES
  ======================================================= */

  const catalogoMap = useMemo(() => {
    const map = new Map();

    catalogo.forEach((m) => {
      const key =
        `${normalize(m.maquina)}|${normalize(
          m.proceso
        )}`;

      map.set(key, {
        eph: Number(m.eph) || 1,
      });
    });

    return map;
  }, []);

  /* =======================================================
     CARGAR DATOS
  ======================================================= */

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!rango.fin) {
      setRegistros([]);
      setProduccion([]);
      setLoading(false);
      return;
    }

    const [
      respuestaRegistros,
      respuestaProduccion,
    ] = await Promise.all([
      supabase
        .from("registros")
        .select("*")
        .gte("fecha", rango.inicio)
        .lte("fecha", rango.fin),

      supabase
        .from("produccion_diaria")
        .select("*")
        .gte("fecha", rango.inicio)
        .lte("fecha", rango.fin)
        .order("fecha", {
          ascending: true,
        }),
    ]);

    if (respuestaRegistros.error) {
      console.error(
        "Error registros:",
        respuestaRegistros.error
      );

      setError(
        "No se pudieron cargar los registros de OEE."
      );
    }

    if (respuestaProduccion.error) {
      console.error(
        "Error producción:",
        respuestaProduccion.error
      );

      setError(
        "No se pudo cargar la producción."
      );
    }

    setRegistros(
      respuestaRegistros.data || []
    );

    setProduccion(
      respuestaProduccion.data || []
    );

    setLoading(false);
  }, [rango]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  /* =======================================================
     CÁLCULO OEE
  ======================================================= */

  const calcularOEE = useCallback(
    (r) => {
      if (
        !r.maquina ||
        !r.proceso ||
        !r.inicio ||
        !r.fin ||
        !r.piezastotales ||
        !r.piezasbuenas
      ) {
        return null;
      }

      const eph =
        catalogoMap.get(
          `${normalize(
            r.maquina
          )}|${normalize(r.proceso)}`
        )?.eph || 1;

      const inicio = new Date(
        `1970-01-01T${r.inicio}:00`
      );

      const fin = new Date(
        `1970-01-01T${r.fin}:00`
      );

      const tiempoProgramado =
        (fin - inicio) / 60000;

      if (tiempoProgramado <= 0) {
        return null;
      }

      const parosPlaneados = r.paros
        ? r.paros
            .filter(
              (p) => p.tipo === "Planeado"
            )
            .reduce(
              (a, b) =>
                a + Number(b.minutos || 0),
              0
            )
        : 0;

      const parosNoPlaneados = r.paros
        ? r.paros
            .filter(
              (p) => p.tipo !== "Planeado"
            )
            .reduce(
              (a, b) =>
                a + Number(b.minutos || 0),
              0
            )
        : 0;

      const piezasMalas =
        r.piezastotales -
        r.piezasbuenas;

      const tiempoOperativo =
        tiempoProgramado -
        parosNoPlaneados -
        parosPlaneados;

      const tiempoOperativoNeto =
        r.piezastotales / eph;

      const perdidasCalidad =
        piezasMalas / eph;

      const tiempoUtil =
        tiempoOperativoNeto -
        perdidasCalidad;

      return {
        tiempoProgramado,
        tiempoOperativo,
        tiempoOperativoNeto,
        tiempoUtil,
      };
    },
    [catalogoMap]
  );

  const calculosOEE = useMemo(
    () =>
      registros
        .map(calcularOEE)
        .filter(Boolean),
    [registros, calcularOEE]
  );

  /* =======================================================
     KPI PONDERADOS
  ======================================================= */

  const indicadores = useMemo(() => {
    let tiempoProgramado = 0;
    let tiempoOperativo = 0;
    let tiempoOperativoNeto = 0;
    let tiempoUtil = 0;

    calculosOEE.forEach((oee) => {
      tiempoProgramado +=
        oee.tiempoProgramado;

      tiempoOperativo +=
        oee.tiempoOperativo;

      tiempoOperativoNeto +=
        oee.tiempoOperativoNeto;

      tiempoUtil +=
        oee.tiempoUtil;
    });

    if (tiempoProgramado <= 0) {
      return {
        disponibilidad: null,
        desempeno: null,
        calidad: null,
        oee: null,
      };
    }

    const disponibilidad =
      tiempoOperativo /
      tiempoProgramado;

    const desempeno =
      tiempoOperativo > 0
        ? tiempoOperativoNeto /
          tiempoOperativo
        : null;

    const calidad =
      tiempoOperativoNeto > 0
        ? tiempoUtil /
          tiempoOperativoNeto
        : null;

    const oee =
      disponibilidad != null &&
      desempeno != null &&
      calidad != null
        ? disponibilidad *
          desempeno *
          calidad
        : null;

    return {
      disponibilidad,
      desempeno,
      calidad,
      oee,
    };
  }, [calculosOEE]);

  /* =======================================================
     PRODUCCIÓN ACUMULADA
  ======================================================= */

  const produccionAcumulada =
    useMemo(() => {
      let metaAcumulada = 0;
      let realAcumulado = 0;

      return produccion.map((fila) => {
        const meta =
          Number(
            fila.meta_carretas
          ) || 0;

        const real =
          Number(
            fila.real_carretas
          ) || 0;

        metaAcumulada += meta;
        realAcumulado += real;

        const dia =
          Number(
            fila.fecha.split("-")[2]
          ) || 0;

        return {
          ...fila,
          dia,
          meta,
          real,
          metaAcumulada,
          realAcumulado,
        };
      });
    }, [produccion]);

  const resumenProduccion =
    useMemo(() => {
      const ultimo =
        produccionAcumulada[
          produccionAcumulada.length - 1
        ];

      if (!ultimo) {
        return {
          meta: 0,
          real: 0,
          brecha: 0,
          cumplimiento: null,
        };
      }

      const meta =
        ultimo.metaAcumulada;

      const real =
        ultimo.realAcumulado;

      return {
        meta,
        real,
        brecha: real - meta,
        cumplimiento:
          meta > 0 ? real / meta : null,
      };
    }, [produccionAcumulada]);

  /* =======================================================
     SEGURIDAD
  ======================================================= */

  const seguridad =
    useMemo(() => {
      const fechaHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );

      let anios =
        fechaHoy.getFullYear() -
        FECHA_ULTIMO_CPT.getFullYear();

      let aniversario = new Date(
        FECHA_ULTIMO_CPT.getFullYear() +
          anios,
        FECHA_ULTIMO_CPT.getMonth(),
        FECHA_ULTIMO_CPT.getDate()
      );

      if (fechaHoy < aniversario) {
        anios -= 1;

        aniversario = new Date(
          FECHA_ULTIMO_CPT.getFullYear() +
            anios,
          FECHA_ULTIMO_CPT.getMonth(),
          FECHA_ULTIMO_CPT.getDate()
        );
      }

      const diferencia =
        fechaHoy - aniversario;

      const dias = Math.floor(
        diferencia /
          (1000 * 60 * 60 * 24)
      );

      return {
        anios,
        dias,
      };
    }, [hoy]);

  /* =======================================================
     CAMBIO DE MES
  ======================================================= */

  const cambiarMes = (cantidad) => {
    const nuevaFecha = new Date(
      anio,
      mes + cantidad,
      1
    );

    setAnio(
      nuevaFecha.getFullYear()
    );

    setMes(
      nuevaFecha.getMonth()
    );
  };

  /* =======================================================
     ESTADOS
  ======================================================= */

  const estadoProduccion =
    resumenProduccion.cumplimiento == null
      ? "gris"
      : resumenProduccion.cumplimiento >= 1
      ? "verde"
      : "rojo";

  const estadoOEE = estadoKPI(
    indicadores.oee,
    META_OEE
  );

  const estadoDisponibilidad =
    estadoKPI(
      indicadores.disponibilidad,
      META_DISPONIBILIDAD
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="bg-slate-50 rounded-2xl p-4 sm:p-6">

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">

        <div>
          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">
              🏭
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
                Dashboard de Producción
              </h2>

              <p className="text-sm text-slate-500">
                Control de seguridad, producción y eficiencia
              </p>
            </div>

          </div>
        </div>

        {/* SELECTOR MES */}
        <div className="flex flex-col items-center">

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                cambiarMes(-1)
              }
              className="w-11 h-11 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-xl font-bold text-blue-600 transition"
            >
              ‹
            </button>

            <div className="min-w-[220px] text-center rounded-xl border border-blue-200 bg-white px-5 py-2 shadow-sm">

              <p className="text-lg font-black uppercase text-blue-800">
                {MESES[mes]} {anio}
              </p>

              {rango.fin && (
                <p className="text-xs text-slate-500">
                  {formatearFecha(
                    rango.inicio
                  )}{" "}
                  →{" "}
                  {formatearFecha(
                    rango.fin
                  )}
                </p>
              )}

            </div>

            <button
              onClick={() =>
                cambiarMes(1)
              }
              className="w-11 h-11 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-xl font-bold text-blue-600 transition"
            >
              ›
            </button>

          </div>

          {rango.fin && (
            <span className="mt-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Datos validados al{" "}
              {formatearFecha(
                rango.fin
              )}
            </span>
          )}

        </div>

        <button
          onClick={cargarDatos}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {loading
            ? "Actualizando..."
            : "🔄 Actualizar"}
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* SIN DÍAS CERRADOS */}
      {!rango.fin && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          {rango.futuro
            ? "El mes seleccionado todavía no ha ocurrido."
            : "Todavía no hay días cerrados para este mes."}
        </div>
      )}

      {/* FILA SUPERIOR */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* SEGURIDAD */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 shadow-sm p-6">

          <div className="flex items-center gap-3 mb-5">

            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl">
              🛡️
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                Seguridad
              </p>

              <h3 className="text-xl font-black text-slate-800">
                Sin CPT
              </h3>
            </div>

          </div>

          <div className="flex flex-col items-center justify-center py-6">

            <p className="text-5xl xl:text-6xl font-black text-emerald-600 text-center leading-tight">
              {seguridad.anios}{" "}
              {seguridad.anios === 1
                ? "AÑO"
                : "AÑOS"}
            </p>

            {seguridad.dias > 0 && (
              <p className="text-4xl xl:text-5xl font-black text-emerald-600 text-center mt-2">
                + {seguridad.dias}{" "}
                {seguridad.dias === 1
                  ? "DÍA"
                  : "DÍAS"}
              </p>
            )}

            <p className="mt-3 text-2xl font-black text-emerald-700">
              SIN CPT
            </p>

          </div>

        </div>

        {/* PRODUCCIÓN */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-6">

          <div className="flex items-center justify-between mb-5">

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500">
                Producción
              </p>

              <h3 className="text-xl font-black text-slate-800">
                Carretas
              </h3>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${ESTILOS[estadoProduccion].badge}`}
            >
              {resumenProduccion.cumplimiento !=
              null
                ? `${(
                    resumenProduccion.cumplimiento *
                    100
                  ).toFixed(1)}% cumplimiento`
                : "Sin datos"}
            </span>

          </div>

          {/* NÚMEROS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">

            <MiniCard
              titulo="Real acumulado"
              valor={numero(
                resumenProduccion.real
              )}
              subtitulo="carretas"
              color="text-blue-600"
            />

            <MiniCard
              titulo="Meta acumulada"
              valor={numero(
                resumenProduccion.meta
              )}
              subtitulo="carretas"
            />

            <MiniCard
              titulo="Cumplimiento"
              valor={
                resumenProduccion.cumplimiento !=
                null
                  ? `${(
                      resumenProduccion.cumplimiento *
                      100
                    ).toFixed(1)}%`
                  : "—"
              }
              color={
                ESTILOS[
                  estadoProduccion
                ].text
              }
            />

            <MiniCard
              titulo="Brecha"
              valor={
                resumenProduccion.brecha >
                0
                  ? `+${numero(
                      resumenProduccion.brecha
                    )}`
                  : numero(
                      resumenProduccion.brecha
                    )
              }
              subtitulo="carretas"
              color={
                resumenProduccion.brecha >=
                0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }
            />

          </div>

          <GraficaProduccion
            datos={
              produccionAcumulada
            }
          />

        </div>

      </div>

      {/* FILA INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* OEE */}
        <div
          className={`rounded-2xl border ${ESTILOS[estadoOEE].border} ${ESTILOS[estadoOEE].bg} shadow-sm p-6`}
        >

          <div className="flex items-center justify-between mb-2">

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Eficiencia
              </p>

              <h3 className="text-2xl font-black text-slate-800">
                OEE Global
              </h3>
            </div>

            <span
              className={`w-4 h-4 rounded-full ${ESTILOS[estadoOEE].dot}`}
            />

          </div>

          <Velocimetro
            valor={indicadores.oee}
            meta={META_OEE}
            titulo="Overall Equipment Effectiveness"
          />

        </div>

        {/* DISPONIBILIDAD */}
        <div
          className={`rounded-2xl border ${ESTILOS[estadoDisponibilidad].border} ${ESTILOS[estadoDisponibilidad].bg} shadow-sm p-6`}
        >

          <div className="flex items-center justify-between mb-2">

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Mantenimiento
              </p>

              <h3 className="text-2xl font-black text-slate-800">
                Disponibilidad
              </h3>
            </div>

            <span
              className={`w-4 h-4 rounded-full ${ESTILOS[estadoDisponibilidad].dot}`}
            />

          </div>

          <Velocimetro
            valor={
              indicadores.disponibilidad
            }
            meta={
              META_DISPONIBILIDAD
            }
            titulo="Tiempo operativo vs programado"
          />

        </div>

      </div>

      {/* FOOTER DASHBOARD */}
      <div className="flex flex-wrap justify-between gap-2 mt-5 px-1 text-xs text-slate-400">

        <span>
          OEE Meta: 65.57% ·
          Disponibilidad Meta: 97.00%
        </span>

        {rango.fin && (
          <span>
            Información operativa
            validada hasta{" "}
            {formatearFecha(
              rango.fin
            )}
          </span>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   MINI CARD
========================================================= */

function MiniCard({
  titulo,
  valor,
  subtitulo,
  color = "text-slate-800",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {titulo}
      </p>

      <p
        className={`text-2xl sm:text-3xl font-black mt-1 ${color}`}
      >
        {valor}
      </p>

      {subtitulo && (
        <p className="text-xs text-slate-500">
          {subtitulo}
        </p>
      )}

    </div>
  );
}
