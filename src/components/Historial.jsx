import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell
} from 'recharts';

const TIPOS_PARO = ["Planeado", "No Planeado", "Anomalía"];

// Utilidad para formatear fechas a YYYY-MM-DD
const fmt = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Calcula rangos de fechas rápidos
const calcularRango = (tipo) => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();

  switch (tipo) {
    case "hoy":
      return { inicio: fmt(hoy), fin: fmt(hoy) };

    case "semana": {
      const dia = hoy.getDay(); // 0 = domingo
      const diff = dia === 0 ? 6 : dia - 1; // lunes como inicio
      const lunes = new Date(y, m, d - diff);
      const domingo = new Date(y, m, d - diff + 6);
      return { inicio: fmt(lunes), fin: fmt(domingo) };
    }

    case "mes": {
      const inicio = new Date(y, m, 1);
      const fin = new Date(y, m + 1, 0);
      return { inicio: fmt(inicio), fin: fmt(fin) };
    }

    case "mesAnterior": {
      const inicio = new Date(y, m - 1, 1);
      const fin = new Date(y, m, 0);
      return { inicio: fmt(inicio), fin: fmt(fin) };
    }

    case "30dias": {
      const inicio = new Date(y, m, d - 29);
      return { inicio: fmt(inicio), fin: fmt(hoy) };
    }

    default:
      return { inicio: "", fin: "" };
  }
};

export default function Historial() {
  const [paros, setParos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [maquinaFiltro, setMaquinaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [mostrarPareto, setMostrarPareto] = useState(false);
  const [filtroRapido, setFiltroRapido] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) throw error;

      const parosFlat = (data || []).flatMap((r) =>
        (r.paros || []).map((p) => ({
          fecha: r.fecha,
          maquina: r.maquina,
          operador: r.nombre,
          inicio: r.inicio,
          fin: r.fin,
          tipo: p.tipo,
          origen: p.origen || "",
          hecho: p.hecho || "",
          causa: p.causa || "",
          accion: p.accion || "",
          minutos: p.minutos,
          comentario: p.comentario || "",
        }))
      );

      setParos(parosFlat);
    } catch (error) {
      console.error("Error cargando registros", error);
      alert("Error al cargar los datos. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parosFiltrados = useMemo(() => {
    return paros.filter((p) => {
      const cumpleFecha =
        (!fechaInicio || p.fecha >= fechaInicio) &&
        (!fechaFin || p.fecha <= fechaFin);

      return (
        cumpleFecha &&
        (!maquinaFiltro || p.maquina === maquinaFiltro) &&
        (!tipoFiltro || p.tipo === tipoFiltro)
      );
    });
  }, [paros, fechaInicio, fechaFin, maquinaFiltro, tipoFiltro]);

  const datosPareto = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const key = p.causa || "Sin causa";
      acc[key] = (acc[key] || 0) + p.minutos;
      return acc;
    }, {});

    const sorted = Object.entries(agrupado)
      .map(([causa, minutos]) => ({ causa, minutos }))
      .sort((a, b) => b.minutos - a.minutos);

    const total = sorted.reduce((sum, item) => sum + item.minutos, 0);
    let acumulado = 0;

    return sorted.map((item) => {
      acumulado += item.minutos;
      const porcentaje = (item.minutos / total) * 100;
      const porcentajeAcumulado = (acumulado / total) * 100;
      return {
        ...item,
        porcentaje: Math.round(porcentaje * 100) / 100,
        porcentajeAcumulado: Math.round(porcentajeAcumulado * 100) / 100,
        esPareto: porcentajeAcumulado <= 80,
      };
    });
  }, [parosFiltrados]);

  const estadisticasPareto = useMemo(() => {
    if (datosPareto.length === 0) return null;

    const totalMinutos = datosPareto.reduce((sum, item) => sum + item.minutos, 0);
    const causas80 = datosPareto.filter(item => item.porcentajeAcumulado <= 80);
    const minutos80 = causas80.reduce((sum, item) => sum + item.minutos, 0);
    const porcentaje80 = (minutos80 / totalMinutos) * 100;

    return {
      totalCausas: datosPareto.length,
      causas80: causas80.length,
      porcentaje80: Math.round(porcentaje80 * 100) / 100,
      totalMinutos,
    };
  }, [datosPareto]);

  // Top 5 por minutos acumulados
  const top5Minutos = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const key = p.maquina || "Sin máquina";
      if (!acc[key]) acc[key] = { maquina: key, minutos: 0, paros: 0 };
      acc[key].minutos += p.minutos || 0;
      acc[key].paros += 1;
      return acc;
    }, {});

    return Object.values(agrupado)
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 5)
      .map((m) => ({
        ...m,
        mttr: m.paros > 0 ? Math.round((m.minutos / m.paros) * 10) / 10 : 0,
      }));
  }, [parosFiltrados]);

  // Top 5 por repetitividad (cantidad de paros)
  const top5Repetitividad = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const key = p.maquina || "Sin máquina";
      if (!acc[key]) acc[key] = { maquina: key, minutos: 0, paros: 0 };
      acc[key].minutos += p.minutos || 0;
      acc[key].paros += 1;
      return acc;
    }, {});

    // Cálculo de días del período para MTBF
    const diasPeriodo =
      fechaInicio && fechaFin
        ? Math.max(
            1,
            (new Date(fechaFin) - new Date(fechaInicio)) / (1000 * 60 * 60 * 24)
          )
        : 30;

    return Object.values(agrupado)
      .sort((a, b) => b.paros - a.paros)
      .slice(0, 5)
      .map((m) => ({
        ...m,
        mtbf: m.paros > 0
          ? Math.round(((diasPeriodo * 24) / m.paros) * 10) / 10
          : 0,
      }));
  }, [parosFiltrados, fechaInicio, fechaFin]);

  const maquinasUnicas = useMemo(() =>
    [...new Set(paros.map((p) => p.maquina))],
    [paros]
  );

  const exportarExcel = () => {
    if (parosFiltrados.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const dataExcel = parosFiltrados.map((p) => ({
      Fecha: p.fecha,
      Máquina: p.maquina,
      Operador: p.operador,
      Tipo: p.tipo,
      Origen: p.origen,
      Minutos: p.minutos,
      "Paro / Hecho": p.hecho,
      Causa: p.causa,
      Acción: p.accion,
      Comentario: p.comentario,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Paros");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    let nombreArchivo = "Historial_Paros";
    if (fechaInicio && fechaFin) {
      nombreArchivo += `_${fechaInicio}_a_${fechaFin}`;
    } else if (fechaInicio) {
      nombreArchivo += `_desde_${fechaInicio}`;
    } else if (fechaFin) {
      nombreArchivo += `_hasta_${fechaFin}`;
    }
    nombreArchivo += ".xlsx";

    saveAs(blob, nombreArchivo);
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setMaquinaFiltro("");
    setTipoFiltro("");
    setFiltroRapido("");
  };

  const aplicarFiltroRapido = (tipo) => {
    setFiltroRapido(tipo);
    if (tipo === "custom") return;
    const { inicio, fin } = calcularRango(tipo);
    setFechaInicio(inicio);
    setFechaFin(fin);
  };

  return (
    <div className="p-4 bg-white shadow w-full">
      <h2 className="text-xl font-bold mb-4">Historial de Paros</h2>

      {/* Filtros rápidos por fecha */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { key: "hoy", label: "📅 Hoy" },
          { key: "semana", label: "📅 Esta semana" },
          { key: "mes", label: "📅 Este mes" },
          { key: "mesAnterior", label: "📅 Mes anterior" },
          { key: "30dias", label: "📅 Últimos 30 días" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => aplicarFiltroRapido(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              filtroRapido === f.key
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              setFiltroRapido("custom");
            }}
            className="border p-2 rounded"
          />
          <label className="text-sm font-medium">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => {
              setFechaFin(e.target.value);
              setFiltroRapido("custom");
            }}
            className="border p-2 rounded"
          />
        </div>

        <select
          value={maquinaFiltro}
          onChange={(e) => setMaquinaFiltro(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todas las máquinas</option>
          {maquinasUnicas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PARO.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>

        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Cargando..." : "🔄 Refrescar"}
        </button>

        <button
          onClick={limpiarFiltros}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          🗑️ Limpiar filtros
        </button>

        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={parosFiltrados.length === 0}
        >
          📤 Exportar Excel
        </button>

        <button
          onClick={() => setMostrarPareto(!mostrarPareto)}
          className={`px-4 py-2 rounded ${
            mostrarPareto
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          📊 Pareto
        </button>
      </div>

      <div className="mb-2 text-sm text-gray-600 flex justify-between">
        <span>
          Mostrando {parosFiltrados.length} de {paros.length} registros
        </span>
        {(fechaInicio || fechaFin) && (
          <span className="text-blue-600">
            Filtro: {fechaInicio || "Inicio"} → {fechaFin || "Fin"}
          </span>
        )}
      </div>

      {/* Top 5: Minutos y Repetitividad lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* TOP 5 MINUTOS */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <h3 className="text-lg font-bold mb-3 text-blue-800">
            ⏱️ Top 5 por Minutos Acumulados
          </h3>
          {top5Minutos.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin datos en el período</p>
          ) : (
            <div className="space-y-2">
              {top5Minutos.map((m, i) => {
                const max = top5Minutos[0].minutos || 1;
                return (
                  <div key={m.maquina} className="flex items-center gap-2">
                    <span className="w-5 font-bold text-blue-700">{i + 1}</span>
                    <span className="w-28 truncate text-sm" title={m.maquina}>
                      {m.maquina}
                    </span>
                    <div className="flex-1 bg-blue-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                        style={{ width: `${(m.minutos / max) * 100}%` }}
                      >
                        {m.minutos} min
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 w-20 text-right">
                      {m.paros}p · MTTR {m.mttr}m
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TOP 5 REPETITIVIDAD */}
        <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-100">
          <h3 className="text-lg font-bold mb-3 text-orange-800">
            🔁 Top 5 por Repetitividad
          </h3>
          {top5Repetitividad.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin datos en el período</p>
          ) : (
            <div className="space-y-2">
              {top5Repetitividad.map((m, i) => {
                const max = top5Repetitividad[0].paros || 1;
                return (
                  <div key={m.maquina} className="flex items-center gap-2">
                    <span className="w-5 font-bold text-orange-700">{i + 1}</span>
                    <span className="w-28 truncate text-sm" title={m.maquina}>
                      {m.maquina}
                    </span>
                    <div className="flex-1 bg-orange-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-full flex items-center justify-end pr-2 text-white text-xs font-semibold"
                        style={{ width: `${(m.paros / max) * 100}%` }}
                      >
                        {m.paros} paros
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 w-24 text-right">
                      {m.minutos}m · MTBF {m.mtbf}h
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pareto */}
      {mostrarPareto && datosPareto.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-bold mb-2">📊 Análisis de Pareto - Causas de Paros</h3>

          {estadisticasPareto && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Total de minutos</div>
                <div className="text-xl font-bold text-blue-600">
                  {estadisticasPareto.totalMinutos} min
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Causas totales</div>
                <div className="text-xl font-bold">
                  {estadisticasPareto.totalCausas}
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Causas que generan el 80%</div>
                <div className="text-xl font-bold text-green-600">
                  {estadisticasPareto.causas80}
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">% representado</div>
                <div className="text-xl font-bold text-purple-600">
                  {estadisticasPareto.porcentaje80}%
                </div>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={datosPareto}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="causa"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis yAxisId="left" label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: '% Acumulado', angle: 90, position: 'insideRight' }}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'porcentajeAcumulado') return `${value}%`;
                  if (name === 'porcentaje') return `${value}%`;
                  return value;
                }}
                labelFormatter={(label) => `Causa: ${label}`}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="minutos" fill="#8884d8" name="Minutos">
                {datosPareto.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.esPareto ? '#4CAF50' : '#F44336'}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="porcentajeAcumulado"
                stroke="#FF7300"
                name="% Acumulado"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Causas que representan el 80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Causas que representan el 20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-1 bg-orange-500"></div>
              <span className="text-sm">Línea del 80% acumulado</span>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Detalle de causas:</h4>
            <div className="overflow-x-auto max-h-40 overflow-y-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-1 text-left">#</th>
                    <th className="border p-1 text-left">Causa</th>
                    <th className="border p-1 text-right">Minutos</th>
                    <th className="border p-1 text-right">%</th>
                    <th className="border p-1 text-right">% Acumulado</th>
                    <th className="border p-1 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosPareto.map((item, index) => (
                    <tr key={index} className={item.esPareto ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1">{item.causa}</td>
                      <td className="border p-1 text-right">{item.minutos}</td>
                      <td className="border p-1 text-right">{item.porcentaje}%</td>
                      <td className="border p-1 text-right">{item.porcentajeAcumulado}%</td>
                      <td className="border p-1 text-center">
                        {item.esPareto ?
                          <span className="text-green-600">✅ 80%</span> :
                          <span className="text-red-600">⬆️ 20%</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando datos...</div>
        ) : parosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay registros que coincidan con los filtros
          </div>
        ) : (
          <table className="min-w-max border text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-2">Fecha</th>
                <th className="border p-2">Máquina</th>
                <th className="border p-2">Operador</th>
                <th className="border p-2">Tipo</th>
                <th className="border p-2">Origen</th>
                <th className="border p-2">Min</th>
                <th className="border p-2">Paro / Hecho</th>
                <th className="border p-2">Causa</th>
                <th className="border p-2">Acción</th>
                <th className="border p-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {parosFiltrados.map((p, i) => (
                <tr key={i} className="text-center hover:bg-gray-50">
                  <td className="border p-2">{p.fecha}</td>
                  <td className="border p-2">{p.maquina}</td>
                  <td className="border p-2">{p.operador}</td>
                  <td className="border p-2">{p.tipo}</td>
                  <td className="border p-2">{p.origen || "-"}</td>
                  <td className="border p-2">{p.minutos}</td>
                  <td className="border p-2 font-semibold">{p.hecho}</td>
                  <td className="border p-2">{p.causa}</td>
                  <td className="border p-2">{p.accion}</td>
                  <td className="border p-2">{p.comentario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
