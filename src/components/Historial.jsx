import React, { useEffect, useState, useMemo, useRef } from "react";
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
const UMBRAL_ALERTA = 120; // minutos por día

const fmt = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const calcularRango = (tipo) => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();

  switch (tipo) {
    case "hoy": return { inicio: fmt(hoy), fin: fmt(hoy) };
    case "ayer": {
      const ayer = new Date(y, m, d - 1);
      return { inicio: fmt(ayer), fin: fmt(ayer) };
    }
    case "semana": {
      const dia = hoy.getDay();
      const diff = dia === 0 ? 6 : dia - 1;
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
    default: return { inicio: "", fin: "" };
  }
};

// 🎯 Combobox reutilizable: select + búsqueda interna
function FiltroSelect({ opciones, valor, onChange, placeholder = "Buscar..." }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const wrapperRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const opcionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter((o) => o.toLowerCase().includes(q));
  }, [opciones, busqueda]);

  const seleccionar = (op) => {
    onChange(op);
    setAbierto(false);
    setBusqueda("");
  };

  const limpiar = (e) => {
    e.stopPropagation();
    onChange("");
    setBusqueda("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => setAbierto(!abierto)}
        className="flex items-center border rounded bg-white px-2 py-1 cursor-pointer text-xs min-w-[160px]"
      >
        <span className={`flex-1 truncate ${valor ? "text-gray-800" : "text-gray-400"}`}>
          {valor || "Todos"}
        </span>
        {valor && (
          <button
            onClick={limpiar}
            className="ml-1 text-gray-500 hover:text-red-600 font-bold"
            title="Quitar filtro"
          >
            ✕
          </button>
        )}
        <span className="ml-1 text-gray-400">▾</span>
      </div>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            autoFocus
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={placeholder}
            className="w-full border-b px-2 py-1 text-xs outline-none"
          />
          {opcionesFiltradas.length === 0 ? (
            <div className="px-2 py-1 text-xs text-gray-400">Sin resultados</div>
          ) : (
            opcionesFiltradas.map((op) => (
              <div
                key={op}
                onClick={() => seleccionar(op)}
                className={`px-2 py-1 text-xs cursor-pointer hover:bg-blue-50 ${
                  valor === op ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                {op}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Historial() {
  const [paros, setParos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [maquinaFiltro, setMaquinaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("No Planeado");
  const [hechoFiltro, setHechoFiltro] = useState("");
  const [mostrarPareto, setMostrarPareto] = useState(true);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [mostrarDetalleAlerta, setMostrarDetalleAlerta] = useState(false);
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

  // 📌 Filtros aplicados a TODO el sistema
  const parosFiltrados = useMemo(() => {
    return paros.filter((p) => {
      const cumpleFecha =
        (!fechaInicio || p.fecha >= fechaInicio) &&
        (!fechaFin || p.fecha <= fechaFin);

      return (
        cumpleFecha &&
        (!maquinaFiltro || p.maquina === maquinaFiltro) &&
        (!tipoFiltro || p.tipo === tipoFiltro) &&
        (!hechoFiltro || p.hecho === hechoFiltro)
      );
    });
  }, [paros, fechaInicio, fechaFin, maquinaFiltro, tipoFiltro, hechoFiltro]);

  // Lista de hechos disponibles según TODOS los filtros excepto el propio hechoFiltro
  const hechosDisponibles = useMemo(() => {
    const base = paros.filter((p) => {
      const cumpleFecha =
        (!fechaInicio || p.fecha >= fechaInicio) &&
        (!fechaFin || p.fecha <= fechaFin);
      return (
        cumpleFecha &&
        (!maquinaFiltro || p.maquina === maquinaFiltro) &&
        (!tipoFiltro || p.tipo === tipoFiltro)
      );
    });
    return [...new Set(base.map((p) => p.hecho).filter(Boolean))].sort();
  }, [paros, fechaInicio, fechaFin, maquinaFiltro, tipoFiltro]);

  // 📊 Pareto agrupado por HECHO
  const datosPareto = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const hecho = p.hecho || "Sin hecho";
      const maquina = p.maquina || "Sin máquina";
      const causa = p.causa || "Sin causa";
      const fecha = p.fecha || "Sin fecha";

      if (!acc[hecho]) {
        acc[hecho] = { hecho, minutos: 0, porMaquina: {}, causasAsociadas: {}, fechas: {} };
      }
      acc[hecho].minutos += p.minutos || 0;
      acc[hecho].porMaquina[maquina] = (acc[hecho].porMaquina[maquina] || 0) + (p.minutos || 0);
      acc[hecho].causasAsociadas[causa] = (acc[hecho].causasAsociadas[causa] || 0) + (p.minutos || 0);
      acc[hecho].fechas[fecha] = (acc[hecho].fechas[fecha] || 0) + (p.minutos || 0);
      return acc;
    }, {});

    const sorted = Object.values(agrupado).sort((a, b) => b.minutos - a.minutos);
    const total = sorted.reduce((sum, item) => sum + item.minutos, 0);
    let acumulado = 0;

    return sorted.map((item) => {
      acumulado += item.minutos;
      const porcentaje = (item.minutos / total) * 100;
      const porcentajeAcumulado = (acumulado / total) * 100;

      const maquinasTexto = Object.entries(item.porMaquina)
        .sort((a, b) => b[1] - a[1])
        .map(([maq, min]) => `${maq} (${min})`)
        .join(", ");

      const causasTexto = Object.entries(item.causasAsociadas)
        .sort((a, b) => b[1] - a[1])
        .map(([c, min]) => `${c} (${min})`)
        .join(", ");

      const fechasTexto = Object.entries(item.fechas)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([fecha, minutos]) => `${fecha} (${minutos}m)`)
        .join(", ");

      return {
        hecho: item.hecho,
        minutos: item.minutos,
        porcentaje: Math.round(porcentaje * 100) / 100,
        porcentajeAcumulado: Math.round(porcentajeAcumulado * 100) / 100,
        esPareto: porcentajeAcumulado <= 80,
        maquinasTexto,
        causasTexto,
        fechasTexto,
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

  // 🚨 Alerta por día
  const alertasPorDia = useMemo(() => {
    const noPlaneadosEnRango = paros.filter((p) => {
      const cumpleFecha =
        (!fechaInicio || p.fecha >= fechaInicio) &&
        (!fechaFin || p.fecha <= fechaFin);
      return cumpleFecha && p.tipo === "No Planeado";
    });

    const porDia = noPlaneadosEnRango.reduce((acc, p) => {
      const key = p.fecha;
      acc[key] = (acc[key] || 0) + (p.minutos || 0);
      return acc;
    }, {});

    const diasAlerta = Object.entries(porDia)
      .map(([fecha, minutos]) => ({ fecha, minutos }))
      .filter((d) => d.minutos >= UMBRAL_ALERTA)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return { activa: diasAlerta.length > 0, diasAlerta, totalDias: diasAlerta.length };
  }, [paros, fechaInicio, fechaFin]);

  // Top 5 minutos
  const top5Minutos = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const key = p.maquina || "Sin máquina";
      if (!acc[key]) acc[key] = { maquina: key, minutos: 0, paros: 0 };
      acc[key].minutos += p.minutos || 0;
      acc[key].paros += 1;
      return acc;
    }, {});
    return Object.values(agrupado).sort((a, b) => b.minutos - a.minutos).slice(0, 5);
  }, [parosFiltrados]);

  // Top 5 repetitividad
  const top5Repetitividad = useMemo(() => {
    const agrupado = parosFiltrados.reduce((acc, p) => {
      const key = p.maquina || "Sin máquina";
      if (!acc[key]) acc[key] = { maquina: key, minutos: 0, paros: 0 };
      acc[key].minutos += p.minutos || 0;
      acc[key].paros += 1;
      return acc;
    }, {});
    return Object.values(agrupado).sort((a, b) => b.paros - a.paros).slice(0, 5);
  }, [parosFiltrados]);

  const maquinasUnicas = useMemo(() =>
    [...new Set(paros.map((p) => p.maquina))], [paros]
  );

  const exportarExcel = () => {
    if (parosFiltrados.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    const dataExcel = parosFiltrados.map((p) => ({
      Fecha: p.fecha, Máquina: p.maquina, Operador: p.operador,
      Tipo: p.tipo, Origen: p.origen, Minutos: p.minutos,
      "Paro / Hecho": p.hecho, Causa: p.causa, Acción: p.accion,
      Comentario: p.comentario,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Paros");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    let nombreArchivo = "Historial_Paros";
    if (fechaInicio && fechaFin) nombreArchivo += `_${fechaInicio}_a_${fechaFin}`;
    else if (fechaInicio) nombreArchivo += `_desde_${fechaInicio}`;
    else if (fechaFin) nombreArchivo += `_hasta_${fechaFin}`;
    nombreArchivo += ".xlsx";
    saveAs(blob, nombreArchivo);
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setMaquinaFiltro("");
    setTipoFiltro("No Planeado");
    setHechoFiltro("");
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

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { key: "hoy", label: "📅 Hoy" },
          { key: "ayer", label: "📅 Ayer" },
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
            type="date" value={fechaInicio}
            onChange={(e) => { setFechaInicio(e.target.value); setFiltroRapido("custom"); }}
            className="border p-2 rounded"
          />
          <label className="text-sm font-medium">Hasta:</label>
          <input
            type="date" value={fechaFin}
            onChange={(e) => { setFechaFin(e.target.value); setFiltroRapido("custom"); }}
            className="border p-2 rounded"
          />
        </div>

        <select
          value={maquinaFiltro}
          onChange={(e) => setMaquinaFiltro(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todas las máquinas</option>
          {maquinasUnicas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PARO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
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
          className={`px-4 py-2 rounded transition ${
            mostrarPareto
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          {mostrarPareto ? "📊 Pareto −" : "📊 Pareto +"}
        </button>

        <button
          onClick={() => setMostrarLista(!mostrarLista)}
          className={`px-4 py-2 rounded transition ${
            mostrarLista
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          {mostrarLista ? "📋 Lista −" : "📋 Lista +"}
        </button>
      </div>

      <div className="mb-2 text-sm text-gray-600 flex justify-between">
        <span>Mostrando {parosFiltrados.length} de {paros.length} registros</span>
        {(fechaInicio || fechaFin) && (
          <span className="text-blue-600">
            Filtro: {fechaInicio || "Inicio"} → {fechaFin || "Fin"}
          </span>
        )}
      </div>

      {hechoFiltro && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-600">Filtro por tipo de paro:</span>
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
            {hechoFiltro}
            <button
              onClick={() => setHechoFiltro("")}
              className="ml-1 text-purple-600 hover:text-purple-900 font-bold"
              title="Quitar filtro"
            >✕</button>
          </span>
        </div>
      )}

      {/* 🚨 Alerta por día - COLAPSABLE */}
      {alertasPorDia.activa && (
        <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 rounded shadow-sm">
          <div
            onClick={() => setMostrarDetalleAlerta(!mostrarDetalleAlerta)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <div className="font-bold text-red-800">
                {alertasPorDia.totalDias === 1
                  ? "Alerta: un día superó el umbral de minutos no planeados"
                  : `Alerta: ${alertasPorDia.totalDias} días superaron el umbral de minutos no planeados`}
              </div>
              <div className="text-sm text-red-700">
                Umbral: <strong>{UMBRAL_ALERTA} min</strong> por día
              </div>
            </div>
            <span className="text-red-700 font-bold text-lg">
              {mostrarDetalleAlerta ? "−" : "+"}
            </span>
          </div>

          {mostrarDetalleAlerta && (
            <div className="mt-3 space-y-1 ml-9 border-t border-red-300 pt-2">
              {alertasPorDia.diasAlerta.map((d) => (
                <div key={d.fecha} className="flex items-center gap-2 text-sm text-red-800">
                  <span>📅</span>
                  <span className="font-semibold">{d.fecha}</span>
                  <span className="ml-auto font-bold">{d.minutos} min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top 5 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <h3 className="text-lg font-bold mb-3 text-blue-800">⏱️ Top 5 por Minutos Acumulados</h3>
          {top5Minutos.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin datos en el período</p>
          ) : (
            <div className="space-y-2">
              {top5Minutos.map((m, i) => {
                const max = top5Minutos[0].minutos || 1;
                return (
                  <div key={m.maquina} className="flex items-center gap-3">
                    <span className="w-5 font-bold text-blue-700 text-right">{i + 1}</span>
                    <span className="w-36 text-sm break-words leading-tight">{m.maquina}</span>
                    <div className="flex-1 bg-blue-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full"
                        style={{ width: `${(m.minutos / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-blue-700 w-20 text-right whitespace-nowrap">
                      {m.minutos} min
                    </span>
                    <span className="text-xs text-gray-500 w-14 text-right whitespace-nowrap">
                      {m.paros} p
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-100">
          <h3 className="text-lg font-bold mb-3 text-orange-800">🔁 Top 5 por Repetitividad</h3>
          {top5Repetitividad.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin datos en el período</p>
          ) : (
            <div className="space-y-2">
              {top5Repetitividad.map((m, i) => {
                const max = top5Repetitividad[0].paros || 1;
                return (
                  <div key={m.maquina} className="flex items-center gap-3">
                    <span className="w-5 font-bold text-orange-700 text-right">{i + 1}</span>
                    <span className="w-36 text-sm break-words leading-tight">{m.maquina}</span>
                    <div className="flex-1 bg-orange-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-full"
                        style={{ width: `${(m.paros / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-orange-700 w-20 text-right whitespace-nowrap">
                      {m.paros} paros
                    </span>
                    <span className="text-xs text-gray-500 w-14 text-right whitespace-nowrap">
                      {m.minutos} m
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
          <h3 className="text-lg font-bold mb-2">📊 Análisis de Pareto - Tipos de Paro</h3>

          {estadisticasPareto && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className={`p-3 rounded shadow ${alertasPorDia.activa ? "bg-red-500 text-white" : "bg-white"}`}>
                <div className={`text-sm ${alertasPorDia.activa ? "text-red-100" : "text-gray-600"}`}>
                  Total de minutos
                </div>
                <div className={`text-xl font-bold ${alertasPorDia.activa ? "text-white" : "text-blue-600"}`}>
                  {estadisticasPareto.totalMinutos} min
                  {alertasPorDia.activa && <span className="ml-2">🚨</span>}
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Tipos de paro</div>
                <div className="text-xl font-bold">{estadisticasPareto.totalCausas}</div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Tipos que generan el 80%</div>
                <div className="text-xl font-bold text-green-600">{estadisticasPareto.causas80}</div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">% representado</div>
                <div className="text-xl font-bold text-purple-600">{estadisticasPareto.porcentaje80}%</div>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={datosPareto}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hecho" angle={-45} textAnchor="end" height={100} interval={0} />
              <YAxis yAxisId="left" domain={[0, 'auto']}
                label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right"
                label={{ value: '% Acumulado', angle: 90, position: 'insideRight' }}
                domain={[0, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded shadow p-2 text-xs max-w-sm">
                      <div className="font-bold mb-1">{item.hecho}</div>
                      <div className="mb-1"><span className="font-semibold">Total:</span> {item.minutos} min</div>
                      <div className="mb-1"><span className="font-semibold">Máquinas:</span> {item.maquinasTexto}</div>
                      <div className="mb-1"><span className="font-semibold">Causas:</span> {item.causasTexto}</div>
                      <div className="text-gray-600"><span className="font-semibold">Fechas:</span> {item.fechasTexto}</div>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="minutos" fill="#8884d8" name="Minutos">
                {datosPareto.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.esPareto ? '#4CAF50' : '#F44336'} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="porcentajeAcumulado"
                stroke="#FF7300" name="% Acumulado" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">
              Detalle por tipo de paro{" "}
              <span className="text-xs font-normal text-gray-500">(clic en una fila para filtrar)</span>
            </h4>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border p-1 text-left">#</th>
                    <th className="border p-1 text-left">Paro (hecho)</th>
                    <th className="border p-1 text-left">Máquinas</th>
                    <th className="border p-1 text-left">Causas</th>
                    <th className="border p-1 text-left">Fechas</th>
                    <th className="border p-1 text-right">Min</th>
                    <th className="border p-1 text-right">%</th>
                    <th className="border p-1 text-right">% Acum</th>
                    <th className="border p-1 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosPareto.map((item, index) => (
                    <tr
                      key={index}
                      onClick={() => setHechoFiltro(hechoFiltro === item.hecho ? "" : item.hecho)}
                      className={`cursor-pointer transition ${
                        item.esPareto ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
                      } ${hechoFiltro === item.hecho ? 'ring-2 ring-purple-400' : ''}`}
                      title="Clic para filtrar por este tipo de paro"
                    >
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1 font-medium">{item.hecho}</td>
                      <td className="border p-1 text-xs text-gray-700">{item.maquinasTexto}</td>
                      <td className="border p-1 text-xs text-gray-700">{item.causasTexto}</td>
                      <td className="border p-1 text-xs text-gray-700">{item.fechasTexto}</td>
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

      {/* Tabla (colapsable) */}
      {mostrarLista && (
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto border-t pt-4">
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
                {/* 👇 FILA DE FILTROS */}
                <tr className="bg-gray-50">
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1">
                    <FiltroSelect
                      opciones={hechosDisponibles}
                      valor={hechoFiltro}
                      onChange={setHechoFiltro}
                      placeholder="Buscar paro..."
                    />
                  </th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
                  <th className="border p-1"></th>
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
      )}
    </div>
  );
}
