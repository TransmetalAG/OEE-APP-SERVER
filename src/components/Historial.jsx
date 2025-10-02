import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Historial() {
  const [registros, setRegistros] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [maquinaFiltro, setMaquinaFiltro] = useState("");
  const [operadorFiltro, setOperadorFiltro] = useState("");
  const [expandedRow, setExpandedRow] = useState(null); // para expandir paros

  // 🔹 Cargar registros de Supabase
  const fetchData = async () => {
    const { data, error } = await supabase.from("registros").select("*").order("fecha", { ascending: false });
    if (error) {
      console.error("❌ Error cargando registros:", error.message);
      return;
    }
    setRegistros(data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Obtener lista única de operadores
  const operadoresUnicos = [...new Set(registros.map((r) => r.nombre))];

  // 🔹 Aplicar filtros
  const registrosFiltrados = registros.filter((r) => {
    return (
      (!fechaFiltro || r.fecha === fechaFiltro) &&
      (!maquinaFiltro || r.maquina === maquinaFiltro) &&
      (!operadorFiltro || r.nombre === operadorFiltro)
    );
  });

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Historial de Producción</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="font-semibold mr-2">Fecha:</label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="border p-2 rounded-none"
          />
        </div>

        <div>
          <label className="font-semibold mr-2">Máquina:</label>
          <select
            value={maquinaFiltro}
            onChange={(e) => setMaquinaFiltro(e.target.value)}
            className="border p-2 rounded-none"
          >
            <option value="">Todas</option>
            {[...new Set(registros.map((r) => r.maquina))].map((m, i) => (
              <option key={i} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold mr-2">Operador:</label>
          <select
            value={operadorFiltro}
            onChange={(e) => setOperadorFiltro(e.target.value)}
            className="border p-2 rounded-none"
          >
            <option value="">Todos</option>
            {operadoresUnicos.map((op, i) => (
              <option key={i} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-none"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Tabla con scroll */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-max border text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Operador</th>
              <th className="border p-2">Máquina</th>
              <th className="border p-2">Proceso</th>
              <th className="border p-2">Carretas</th>
              <th className="border p-2">Piezas Totales</th>
              <th className="border p-2">Piezas Buenas</th>
              <th className="border p-2">Horarios</th>
              <th className="border p-2">Paros</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map((r, i) => (
              <React.Fragment key={i}>
                <tr className="text-center">
                  <td className="border p-2">{r.fecha}</td>
                  <td className="border p-2">{r.nombre}</td>
                  <td className="border p-2">{r.maquina}</td>
                  <td className="border p-2">{r.proceso}</td>
                  <td className="border p-2">{r.carretas}</td>
                  <td className="border p-2">{r.piezasTotales}</td>
                  <td className="border p-2">{r.piezasBuenas}</td>
                  <td className="border p-2">
                    {r.inicio} - {r.fin}
                  </td>
                  <td className="border p-2">
                    <button
                      className="bg-gray-600 text-white px-2 py-1 rounded-none"
                      onClick={() =>
                        setExpandedRow(expandedRow === i ? null : i)
                      }
                    >
                      {expandedRow === i ? "Ocultar" : "Ver paros"}
                    </button>
                  </td>
                </tr>

                {/* Fila expandida para paros */}
                {expandedRow === i && r.paros && r.paros.length > 0 && (
                  <tr>
                    <td colSpan="9" className="border p-2 bg-gray-50 text-left">
                      <ul className="list-disc pl-6">
                        {r.paros.map((p, j) => (
                          <li key={j}>
                            <strong>{p.tipo}</strong> - {p.minutos} min -{" "}
                            {p.descripcion}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
