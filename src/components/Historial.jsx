import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Historial() {
  const [paros, setParos] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [maquinaFiltro, setMaquinaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  /* =======================
     CARGAR PAROS
  ======================= */
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error cargando registros", error);
      return;
    }

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
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =======================
     FILTROS
  ======================= */
  const parosFiltrados = paros.filter((p) => {
    return (
      (!fechaFiltro || p.fecha === fechaFiltro) &&
      (!maquinaFiltro || p.maquina === maquinaFiltro) &&
      (!tipoFiltro || p.tipo === tipoFiltro)
    );
  });

  /* =======================
     EXPORTAR A EXCEL
  ======================= */
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
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const nombreArchivo = `Historial_Paros_${fechaFiltro || "todos"}.xlsx`;
    saveAs(blob, nombreArchivo);
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Historial de Paros</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="border p-2"
        />

        <select
          value={maquinaFiltro}
          onChange={(e) => setMaquinaFiltro(e.target.value)}
          className="border p-2"
        >
          <option value="">Todas las máquinas</option>
          {[...new Set(paros.map((p) => p.maquina))].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border p-2"
        >
          <option value="">Todos los tipos</option>
          <option value="Planeado">Planeado</option>
          <option value="No Planeado">No Planeado</option>
          <option value="Anomalía">Anomalía</option>
        </select>

        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2"
        >
          🔄 Refrescar
        </button>

        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2"
        >
          📤 Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
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
              <tr key={i} className="text-center">
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
      </div>
    </div>
  );
}
