import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TIPOS_PARO = ["Planeado", "No Planeado", "Anomalía"];

export default function Historial() {
  const [paros, setParos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [maquinaFiltro, setMaquinaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

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

  // Filtros con rango de fechas
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

    // Nombre del archivo con el rango de fechas
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

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setMaquinaFiltro("");
    setTipoFiltro("");
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Historial de Paros</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        {/* Rango de fechas */}
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border p-2 rounded"
            aria-label="Fecha inicio"
          />
          <label className="text-sm font-medium">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border p-2 rounded"
            aria-label="Fecha fin"
          />
        </div>

        {/* Filtro de máquina */}
        <select
          value={maquinaFiltro}
          onChange={(e) => setMaquinaFiltro(e.target.value)}
          className="border p-2 rounded"
          aria-label="Filtrar por máquina"
        >
          <option value="">Todas las máquinas</option>
          {maquinasUnicas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Filtro de tipo */}
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border p-2 rounded"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PARO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        {/* Botones de acción */}
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
      </div>

      {/* Información de registros */}
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
