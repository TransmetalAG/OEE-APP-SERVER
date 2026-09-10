import React, { useEffect, useState, useMemo, useCallback } from "react";
import { catalogo } from "../data/catalogo";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* =======================
   CONSTANTES
======================= */
const TABLA = "registros";

// Meta de OEE (fracción 0-1)
const META_OEE = 0.6557;

// Umbrales relativos a la meta
const UMBRAL_VERDE = META_OEE * 0.99; // ≥ 99% de la meta → 64.91%
const UMBRAL_AMBAR = META_OEE * 0.92; // ≥ 92% de la meta → 60.32%

/* =======================
   HELPERS
======================= */
const normalize = (txt) =>
  txt
    ? txt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";

const f1 = (n) => Number(n || 0).toFixed(1);
const pct = (n) => `${f1((n ?? 0) * 100)}%`;

const colorOEE = (v) => {
  if (v == null) return "text-slate-400";
  if (v >= UMBRAL_VERDE) return "text-emerald-600";
  if (v >= UMBRAL_AMBAR) return "text-amber-600";
  return "text-rose-600";
};

/* =======================
   VELOCÍMETRO OEE (SVG)
======================= */
function VelocimetroOEE({ valor }) {
  const v = valor ?? 0;

  const ANGULO_TOTAL = 220;
  const angulo = Math.min(Math.max(v, 0), 1) * ANGULO_TOTAL;

  const cx = 120;
  const cy = 120;
  const r = 90;
  const grosor = 16;

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

  const posVerde = UMBRAL_VERDE * ANGULO_TOTAL;
  const posAmbar = UMBRAL_AMBAR * ANGULO_TOTAL;

  const aguja = polar(angulo);
  const colorAguja = colorOEE(valor);

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 240 170" className="w-full max-w-[220px]">
        <path
          d={arcPath(0, ANGULO_TOTAL)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={grosor}
          strokeLinecap="round"
        />
        <path
          d={arcPath(0, posAmbar)}
          fill="none"
          stroke="#fb7185"
          strokeWidth={grosor}
          strokeLinecap="round"
        />
        <path
          d={arcPath(posAmbar, posVerde)}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={grosor}
          strokeLinecap="butt"
        />
        <path
          d={arcPath(posVerde, ANGULO_TOTAL)}
          fill="none"
          stroke="#10b981"
          strokeWidth={grosor}
          strokeLinecap="round"
        />

        <line
          x1={cx}
          y1={cy}
          x2={aguja.x}
          y2={aguja.y}
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="7" fill="#0f172a" />
        <circle cx={cx} cy={cy} r="3" fill="white" />

        <text
          x={cx}
          y={cy + 42}
          textAnchor="middle"
          className={`text-2xl font-bold ${colorAguja}`}
          fill="currentColor"
          style={{ fontSize: 26, fontWeight: 700 }}
        >
          {valor != null ? `${f1(v * 100)}%` : "—"}
        </text>
      </svg>

      <div className="flex items-center gap-2 -mt-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">
          Meta {f1(META_OEE * 100)}%
        </span>
      </div>
    </div>
  );
}

/* =======================
   COMPONENTE PRINCIPAL
======================= */
export default function KPIs() {
  const [registros, setRegistros] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  /* ---------- Toast helper ---------- */
  const mostrarToast = (msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  /* ---------- Carga de datos ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLA)
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("❌ Error cargando registros:", error.message);
    } else {
      setRegistros(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Parseo de fechas (tal cual tu versión) ---------- */
  const parseFecha = (fechaStr) => {
    if (!fechaStr) return null;
    if (fechaStr.includes("/")) {
      const [d, m, y] = fechaStr.split("/");
      return new Date(`${y}-${m}-${d}`);
    }
    return new Date(fechaStr);
  };

  /* ---------- Catálogo en Map (performance, sin tocar cálculo) ---------- */
  const catalogoMap = useMemo(() => {
    const map = new Map();
    catalogo.forEach((m) => {
      const key = `${normalize(m.maquina)}|${normalize(m.proceso)}`;
      map.set(key, {
        eph: Number(m.eph) || 1,
      });
    });
    return map;
  }, []);

  /* ---------- Cálculo de OEE (IDÉNTICO a tu primera versión) ---------- */
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
          `${normalize(r.maquina)}|${normalize(r.proceso)}`
        )?.eph || 1;

      const inicio = new Date(`1970-01-01T${r.inicio}:00`);
      const fin = new Date(`1970-01-01T${r.fin}:00`);
      const tiempoProgramado = (fin - inicio) / 60000;
      if (tiempoProgramado <= 0) return null;

      const parosPlaneados = r.paros
        ? r.paros
            .filter((p) => p.tipo === "Planeado")
            .reduce((a, b) => a + Number(b.minutos || 0), 0)
        : 0;

      const parosNoPlaneados = r.paros
        ? r.paros
            .filter((p) => p.tipo !== "Planeado")
            .reduce((a, b) => a + Number(b.minutos || 0), 0)
        : 0;

      const piezasMalas = r.piezastotales - r.piezasbuenas;

      const tiempoOperativo =
        tiempoProgramado - parosNoPlaneados - parosPlaneados;
      const tiempoOperativoNeto = r.piezastotales / eph;
      const perdidaRitmo = tiempoOperativo - tiempoOperativoNeto;
      const perdidasCalidad = piezasMalas / eph;
      const tiempoUtil = tiempoOperativoNeto - perdidasCalidad;

      const disponibilidad = tiempoOperativo / tiempoProgramado;
      const desempeno =
        tiempoOperativo > 0
          ? Math.min(tiempoOperativoNeto / tiempoOperativo, 1)
          : 0;
      const calidad =
        tiempoOperativoNeto > 0 ? tiempoUtil / tiempoOperativoNeto : 0;

      const oee = disponibilidad * desempeno * calidad;

      return {
        fecha: r.fecha,
        maquina: r.maquina,
        proceso: r.proceso,
        tiempoProgramado,
        parosPlaneados,
        parosNoPlaneados,
        piezasBuenas: r.piezasbuenas,
        piezasMalas,
        tiempoOperativo,
        perdidaRitmo,
        tiempoOperativoNeto,
        perdidasCalidad,
        tiempoUtil,
        disponibilidad,
        desempeno,
        calidad,
        oee,
      };
    },
    [catalogoMap]
  );

  /* ---------- Filtro de fechas ---------- */
  const registrosFiltrados = useMemo(() => {
    const desde = parseFecha(fechaInicio);
    const hasta = parseFecha(fechaFin);

    return registros.filter((r) => {
      const fechaRegistro = parseFecha(r.fecha);
      if (!fechaRegistro || isNaN(fechaRegistro.getTime())) return false;
      if (desde && fechaRegistro < desde) return false;
      if (hasta && fechaRegistro > hasta) return false;
      return true;
    });
  }, [registros, fechaInicio, fechaFin]);

  /* ---------- OEE memoizado por registro ---------- */
  const oeePorRegistro = useMemo(
    () =>
      registrosFiltrados
        .map((r) => ({ registro: r, oee: calcularOEE(r) }))
        .filter((x) => x.oee),
    [registrosFiltrados, calcularOEE]
  );

  /* ---------- KPI ponderados (misma lógica que la tuya) ---------- */
  const calcularPonderado = (numCampo, denCampo) => {
    let n = 0;
    let d = 0;
    oeePorRegistro.forEach(({ oee }) => {
      n += oee[numCampo];
      d += oee[denCampo];
    });
    return d > 0 ? n / d : null;
  };

  const disponibilidadPonderada = calcularPonderado(
    "tiempoOperativo",
    "tiempoProgramado"
  );
  const desempenoPonderado = calcularPonderado(
    "tiempoOperativoNeto",
    "tiempoOperativo"
  );
  const calidadPonderada = calcularPonderado(
    "tiempoUtil",
    "tiempoOperativoNeto"
  );
  const oeePonderado =
    disponibilidadPonderada && desempenoPonderado && calidadPonderada
      ? disponibilidadPonderada * desempenoPonderado * calidadPonderada
      : null;

  /* ---------- Totales para fila TOTAL (misma lógica que la tuya) ---------- */
  const totales = useMemo(() => {
    return oeePorRegistro.reduce(
      (acc, { oee }) => ({
        tiempoProgramado: acc.tiempoProgramado + oee.tiempoProgramado,
        parosPlaneados: acc.parosPlaneados + oee.parosPlaneados,
        parosNoPlaneados: acc.parosNoPlaneados + oee.parosNoPlaneados,
        tiempoOperativo: acc.tiempoOperativo + oee.tiempoOperativo,
        perdidaRitmo: acc.perdidaRitmo + oee.perdidaRitmo,
        tiempoOperativoNeto:
          acc.tiempoOperativoNeto + oee.tiempoOperativoNeto,
        perdidasCalidad: acc.perdidasCalidad + oee.perdidasCalidad,
        tiempoUtil: acc.tiempoUtil + oee.tiempoUtil,
      }),
      {
        tiempoProgramado: 0,
        parosPlaneados: 0,
        parosNoPlaneados: 0,
        tiempoOperativo: 0,
        perdidaRitmo: 0,
        tiempoOperativoNeto: 0,
        perdidasCalidad: 0,
        tiempoUtil: 0,
      }
    );
  }, [oeePorRegistro]);

  /* ---------- Atajos de fecha ---------- */
  const setHoy = () => {
    const hoy = new Date().toISOString().split("T")[0];
    setFechaInicio(hoy);
    setFechaFin(hoy);
  };

  const setUltimos7 = () => {
    const fin = new Date();
    const ini = new Date();
    ini.setDate(ini.getDate() - 6);
    setFechaInicio(ini.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  const setUltimos30 = () => {
    const fin = new Date();
    const ini = new Date();
    ini.setDate(ini.getDate() - 29);
    setFechaInicio(ini.toISOString().split("T")[0]);
    setFechaFin(fin.toISOString().split("T")[0]);
  };

  /* ---------- Export Excel (misma lógica que la tuya) ---------- */
  const exportarExcel = () => {
    const datosExport = oeePorRegistro.map(({ oee }) => ({
      Fecha: oee.fecha,
      Máquina: oee.maquina,
      Proceso: oee.proceso,
      "Tiempo Programado (min)": oee.tiempoProgramado.toFixed(1),
      "Paros Planeados (min)": oee.parosPlaneados,
      "Paros No Planeados (min)": oee.parosNoPlaneados,
      "Piezas Buenas": oee.piezasBuenas,
      "Piezas Malas": oee.piezasMalas,
      "Tiempo Operativo Neto (min)": oee.tiempoOperativoNeto.toFixed(1),
      "Tiempo Útil (min)": oee.tiempoUtil.toFixed(1),
      "Disponibilidad (%)": (oee.disponibilidad * 100).toFixed(1),
      "Desempeño (%)": (oee.desempeno * 100).toFixed(1),
      "Calidad (%)": (oee.calidad * 100).toFixed(1),
      "OEE (%)": (oee.oee * 100).toFixed(1),
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OEE");

    const fecha = new Date().toISOString().split("T")[0];
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `OEE_${fecha}.xlsx`);
    mostrarToast("✓ Excel exportado", "success");
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ---------- HEADER STICKY ---------- */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pb-3 bg-slate-50/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <h2 className="text-base font-semibold text-slate-800 tracking-tight">
                KPIs y OEE
              </h2>
              <span className="text-xs text-slate-400">
                {oeePorRegistro.length} registro(s)
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition disabled:opacity-60"
              >
                {loading ? "Cargando…" : "🔄 Refrescar"}
              </button>
              <button
                onClick={exportarExcel}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition"
              >
                📤 Exportar ({oeePorRegistro.length})
              </button>
            </div>
          </div>
        </div>

        {/* ---------- KPI CARDS + VELOCÍMETRO ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Velocímetro OEE */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 self-start">
              OEE Global
            </h3>
            <VelocimetroOEE valor={oeePonderado} />
          </div>

          {/* Otros 3 KPIs */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Disponibilidad"
              value={disponibilidadPonderada}
              color="indigo"
            />
            <KpiCard
              label="Desempeño"
              value={desempenoPonderado}
              color="sky"
            />
            <KpiCard
              label="Calidad"
              value={calidadPonderada}
              color="violet"
            />
          </div>
        </div>

        {/* ---------- FILTROS ---------- */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              <button
                onClick={setHoy}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                Hoy
              </button>
              <button
                onClick={setUltimos7}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                7 días
              </button>
              <button
                onClick={setUltimos30}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                30 días
              </button>
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">
                Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {(fechaInicio || fechaFin) && (
              <button
                onClick={() => {
                  setFechaInicio("");
                  setFechaFin("");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
              >
                ✕ Quitar filtro
              </button>
            )}
          </div>
        </div>

        {/* ---------- TABLA ---------- */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {oeePorRegistro.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic">
              {registros.length === 0
                ? "No hay datos registrados todavía."
                : "Sin registros en el rango seleccionado."}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-max w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <Th>Fecha</Th>
                    <Th>Máquina</Th>
                    <Th>Proceso</Th>
                    <Th>T. Prog.</Th>
                    <Th>P. Plan.</Th>
                    <Th>P. No Plan.</Th>
                    <Th>P. Buenas</Th>
                    <Th>P. Malas</Th>
                    <Th>T. Oper.</Th>
                    <Th>Pérd. Ritmo</Th>
                    <Th>T. Op. Neto</Th>
                    <Th>Pérd. Calidad</Th>
                    <Th>T. Útil</Th>
                    <Th>Disp.</Th>
                    <Th>Desemp.</Th>
                    <Th>Calidad</Th>
                    <Th>OEE</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {oeePorRegistro.map(({ registro, oee }, i) => (
                    <tr
                      key={registro._id || `${oee.fecha}-${oee.maquina}-${oee.proceso}-${i}`}
                      className="text-center hover:bg-slate-50 transition-colors"
                    >
                      <Td>{oee.fecha}</Td>
                      <Td>{oee.maquina}</Td>
                      <Td>{oee.proceso}</Td>
                      <Td>{f1(oee.tiempoProgramado)}</Td>
                      <Td>{f1(oee.parosPlaneados)}</Td>
                      <Td>{f1(oee.parosNoPlaneados)}</Td>
                      <Td>{oee.piezasBuenas}</Td>
                      <Td>{oee.piezasMalas}</Td>
                      <Td>{f1(oee.tiempoOperativo)}</Td>
                      <Td>{f1(oee.perdidaRitmo)}</Td>
                      <Td>{f1(oee.tiempoOperativoNeto)}</Td>
                      <Td>{f1(oee.perdidasCalidad)}</Td>
                      <Td>{f1(oee.tiempoUtil)}</Td>
                      <Td>{pct(oee.disponibilidad)}</Td>
                      <Td>{pct(oee.desempeno)}</Td>
                      <Td>{pct(oee.calidad)}</Td>
                      <td
                        className={`border-l border-slate-100 px-3 py-2 font-bold ${colorOEE(
                          oee.oee
                        )}`}
                      >
                        {pct(oee.oee)}
                      </td>
                    </tr>
                  ))}

                  {/* Fila TOTAL */}
                  <tr className="font-bold bg-slate-100 sticky bottom-0 border-t-2 border-slate-300">
                    <td className="px-3 py-2 text-center" colSpan={3}>
                      TOTAL
                    </td>
                    <Td>{f1(totales.tiempoProgramado)}</Td>
                    <Td>{f1(totales.parosPlaneados)}</Td>
                    <Td>{f1(totales.parosNoPlaneados)}</Td>
                    <td className="px-3 py-2" colSpan={2}></td>
                    <Td>{f1(totales.tiempoOperativo)}</Td>
                    <Td>{f1(totales.perdidaRitmo)}</Td>
                    <Td>{f1(totales.tiempoOperativoNeto)}</Td>
                    <Td>{f1(totales.perdidasCalidad)}</Td>
                    <Td>{f1(totales.tiempoUtil)}</Td>
                    <td className="px-3 py-2 text-center" colSpan={3}>
                      <span className="text-xs text-slate-500 font-normal">
                        (KPI global arriba)
                      </span>
                    </td>
                    <td
                      className={`border-l border-slate-200 px-3 py-2 ${colorOEE(
                        oeePonderado
                      )}`}
                    >
                      {oeePonderado != null ? pct(oeePonderado) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---------- TOAST ---------- */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow-lg border ${
            toast.tipo === "warning"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : toast.tipo === "error"
              ? "bg-rose-100 text-rose-800 border-rose-200"
              : "bg-emerald-100 text-emerald-800 border-emerald-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* =======================
   SUBCOMPONENTES
======================= */
function KpiCard({ label, value, color = "indigo" }) {
  const tones = {
    indigo: {
      text: "text-indigo-600",
      bar: "bg-indigo-500",
      bg: "bg-indigo-50 border-indigo-100",
    },
    sky: {
      text: "text-sky-600",
      bar: "bg-sky-500",
      bg: "bg-sky-50 border-sky-100",
    },
    violet: {
      text: "text-violet-600",
      bar: "bg-violet-500",
      bg: "bg-violet-50 border-violet-100",
    },
  };
  const t = tones[color] || tones.indigo;
  const pctVal = Math.min(Math.max((value ?? 0) * 100, 0), 100);

  return (
    <div className={`rounded-xl border ${t.bg} p-5 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${t.text}`}>
        {value != null ? `${pctVal.toFixed(1)}%` : "—"}
      </p>
      <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full ${t.bar} transition-all`}
          style={{ width: `${pctVal}%` }}
        />
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-slate-200">
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-2 whitespace-nowrap ${className}`}>{children}</td>
  );
}
