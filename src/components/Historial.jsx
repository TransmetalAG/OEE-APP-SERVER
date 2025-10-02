import React, { useEffect, useState } from "react";

export default function Historial() {
  const [registros, setRegistros] = useState([]);

  // Cargar registros al inicio
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("registros") || "[]");
    setRegistros(data);
  }, []);

  // Eliminar un registro
  const eliminar = (i) => {
    const nuevos = registros.filter((_, idx) => idx !== i);
    setRegistros(nuevos);
    localStorage.setItem("registros", JSON.stringify(nuevos));
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (registros.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const encabezados = [
      "Fecha",
      "Código",
      "Nombre",
      "Máquina",
      "Inicio",
      "Fin",
      "Carretas",
      "Piezas Totales",
      "Piezas Buenas",
      "Paros",
    ];

    const filas = registros.map((r) => [
      r.fecha || "",
      r.codigo,
      r.nombre,
      r.maquina,
      r.inicio,
      r.fin,
      r.carretas,
      r.piezasTotales,
      r.piezasBuenas,
      r.paros.map((p) => `${p.tipo}:${p.minutos}min(${p.descripcion})`).join(" | "),
    ]);

    const csvContent =
      [encabezados, ...filas].map((f) => f.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "historial.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Historial de Producción</h2>

      {registros.length === 0 ? (
        <p>No hay registros guardados.</p>
      ) : (
        <div>
          <table className="w-full border mb-4 text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Operador</th>
                <th className="border p-2">Máquina</th>
                <th className="border p-2">Horario</th>
                <th className="border p-2">Piezas</th>
                <th className="border p-2">Paros</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={i}>
                  <td className="border p-2">
                    {r.codigo} - {r.nombre}
                  </td>
                  <td className="border p-2">{r.maquina}</td>
                  <td className="border p-2">
                    {r.inicio} - {r.fin}
                  </td>
                  <td className="border p-2">
                    {r.piezasBuenas}/{r.piezasTotales}
                  </td>
                  <td className="border p-2">
                    {r.paros.map(
                      (p, j) =>
                        `${p.tipo}: ${p.minutos}min (${p.descripcion})${
                          j < r.paros.length - 1 ? " | " : ""
                        }`
                    )}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => eliminar(i)}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={exportarCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Exportar CSV
          </button>
        </div>
      )}
    </div>
  );
}
