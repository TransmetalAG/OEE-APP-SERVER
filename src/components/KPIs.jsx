import React, { useEffect, useState } from "react";
import { catalogo } from "../data/catalogo";

export default function KPIs() {
  const [registros, setRegistros] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState("");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("registros") || "[]");
    setRegistros(data);
  }, []);

  const calcularOEE = (r) => {
    if (!r.maquina || !r.proceso || !r.inicio || !r.fin || !r.piezasTotales || !r.piezasBuenas) {
      return null; // ignora registros incompletos
    }

    const maquina = catalogo.find(
      (m) => m.maquina === r.maquina && m.proceso === r.proceso
    );
    const eph = maquina && maquina.eph ? Number(maquina.eph) : 1;

    const inicio = new Date(`1970-01-01T${r.inicio}:00`);
    const fin = new Date(`1970-01-01T${r.fin}:00`);
    const tiempoProgramado = (fin - inicio) / 60000;
    if (tiempoProgramado <= 0) return null;

    const parosNoPlaneados = r.paros
      .filter((p) => p.tipo !== "Planeado")
      .reduce((a, b) => a + Number(b.minutos || 0), 0);

    const parosPlaneados = r.paros
      .filter((p) => p.tipo === "Planeado")
      .reduce((a, b) => a + Number(b.minutos || 0), 0);

    const tiempoOperativo = tiempoProgramado - parosNoPlaneados - parosPlaneados;
    const tiempoOperativoNeto = r.piezasTotales / eph;
    const perdidaRitmo = tiempoOperativo - tiempoOperativoNeto;
    const perdidasCalidad = (r.piezasTotales - r.piezasBuenas) / eph;
    const tiempoUtil = tiempoOperativoNeto - perdidasCalidad;

    const disponibilidad = tiempoOperativo / tiempoProgramado;
    const desempeno = tiempoOperativoNeto / tiempoOperativo;
    const calidad = tiempoUtil / tiempoOperativoNeto;
    const oeeFinal = disponibilidad * desempeno * calidad;

    return {
      tiempoProgramado,
      parosNoPlaneados,
      parosPlaneados,
      tiempoOperativo,
      perdidaRitmo,
      tiempoOperativoNeto,
      perdidasCalidad,
      tiempoUtil,
      disponibilidad,
      desempeno,
      calidad,
      oee: oeeFinal,
    };
  };

  const registrosFiltrados = fechaFiltro
    ? registros.filter((r) => r.fecha === fechaFiltro)
    : registros;

  if (registros.length === 0) {
    return <p className="p-4">No hay datos registrados todavía.</p>;
  }

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">KPIs y OEE por Máquina</h2>

      {/* Filtro por fecha */}
      <div className="mb-4">
        <label className="font-semibold mr-2">Filtrar por fecha:</label>
        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="border p-2"
        />
        {fechaFiltro && (
          <button
            onClick={() => setFechaFiltro("")}
            className="ml-2 bg-gray-300 px-3 py-1"
          >
            Quitar filtro
          </button>
        )}
      </div>

      {/* Tabla con scroll horizontal y encabezado fijo */}
      <div className="overflow-x-auto">
        <table className="min-w-max border text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Máquina</th>
              <th className="border p-2">Proceso</th>
              <th className="border p-2">Tiempo Programado</th>
              <th className="border p-2">Paros No Planeados</th>
              <th className="border p-2">Paros Planeados</th>
              <th className="border p-2">Tiempo Operativo</th>
              <th className="border p-2">Pérdida de Ritmo</th>
              <th className="border p-2">Tiempo Operativo Neto</th>
              <th className="border p-2">Pérdidas de Calidad</th>
              <th className="border p-2">Tiempo Útil</th>
              <th className="border p-2">Disponibilidad</th>
              <th className="border p-2">Desempeño</th>
              <th className="border p-2">Calidad</th>
              <th className="border p-2">OEE</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.map((r, i) => {
              const oee = calcularOEE(r);
              if (!oee) return null;
              return (
                <tr key={i} className="text-center">
                  <td className="border p-2">{r.fecha}</td>
                  <td className="border p-2">{r.maquina}</td>
                  <td className="border p-2">{r.proceso}</td>
                  <td className="border p-2">{oee.tiempoProgramado.toFixed(1)}</td>
                  <td className="border p-2">{oee.parosNoPlaneados}</td>
                  <td className="border p-2">{oee.parosPlaneados}</td>
                  <td className="border p-2">{oee.tiempoOperativo.toFixed(1)}</td>
                  <td className="border p-2">{oee.perdidaRitmo.toFixed(1)}</td>
                  <td className="border p-2">{oee.tiempoOperativoNeto.toFixed(1)}</td>
                  <td className="border p-2">{oee.perdidasCalidad.toFixed(1)}</td>
                  <td className="border p-2">{oee.tiempoUtil.toFixed(1)}</td>
                  <td className="border p-2">{(oee.disponibilidad * 100).toFixed(1)}%</td>
                  <td className="border p-2">{(oee.desempeno * 100).toFixed(1)}%</td>
                  <td className="border p-2">{(oee.calidad * 100).toFixed(1)}%</td>
                  <td className="border p-2 font-bold">{(oee.oee * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
