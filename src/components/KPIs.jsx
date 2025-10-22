import React, { useEffect, useState } from "react";
import { catalogo } from "../data/catalogo";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function KPIs() {
  const [registros, setRegistros] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Traer datos de Supabase
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) {
      console.error("❌ Error cargando registros:", error.message);
      setLoading(false);
      return;
    }
    setRegistros(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calcularOEE = (r) => {
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

    const normalize = (txt) =>
      txt
        ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
        : "";

    const maquina = catalogo.find(
      (m) =>
        normalize(m.maquina) === normalize(r.maquina) &&
        normalize(m.proceso) === normalize(r.proceso)
    );

    const eph = maquina?.eph ? Number(maquina.eph) : 1;

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

    const tiempoOperativo = tiempoProgramado - parosNoPlaneados - parosPlaneados;
    const tiempoOperativoNeto = r.piezastotales / eph;
    const perdidaRitmo = tiempoOperativo - tiempoOperativoNeto;
    const perdidasCalidad = piezasMalas / eph;
    const tiempoUtil = tiempoOperativoNeto - perdidasCalidad;

    const disponibilidad = tiempoOperativo / tiempoProgramado;

    let desempeno =
      tiempoOperativo > 0 ? tiempoOperativoNeto / tiempoOperativo : 0;
    desempeno = Math.min(desempeno, 1);

    const calidad =
      tiempoOperativoNeto > 0 ? tiempoUtil / tiempoOperativoNeto : 0;
    const oeeFinal = disponibilidad * desempeno * calidad;

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
      oee: oeeFinal,
    };
  };

  const registrosFiltrados = registros.filter((r) => {
    if (fechaInicio && r.fecha < fechaInicio) return false;
    if (fechaFin && r.fecha > fechaFin) return false;
    return true;
  });

  const calcularOEEPonderado = () => {
    let totalTiempo = 0;
    let sumaOEE = 0;

    registrosFiltrados.forEach((r) => {
      const oee = calcularOEE(r);
      if (oee) {
        sumaOEE += oee.oee * oee.tiempoProgramado;
        totalTiempo += oee.tiempoProgramado;
      }
    });

    return totalTiempo > 0 ? sumaOEE / totalTiempo : null;
  };

  const oeePonderado = calcularOEEPonderado();

  // 🔹 Exportar a Excel (actualizado)
  const exportarExcel = () => {
    const datosExport = registrosFiltrados
      .map((r) => calcularOEE(r))
      .filter(Boolean)
      .map((oee) => ({
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
    const fileName = `OEE_${fecha}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  if (loading) return <p className="p-4">⏳ Cargando datos...</p>;

  if (registros.length === 0) {
    return (
      <div className="p-4">
        <p>No hay datos registrados todavía.</p>
        <button
          onClick={fetchData}
          className="mt-2 bg-blue-600 text-white px-4 py-2"
        >
          🔄 Refrescar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">KPIs y OEE por Máquina</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded-none"
          >
            🔄 Refrescar
          </button>
          <button
            onClick={exportarExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-none"
          >
            📤 Exportar Excel
          </button>
        </div>
      </div>

      {oeePonderado !== null && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 font-semibold rounded">
          📊 OEE Ponderado ({fechaInicio || "inicio"} →{" "}
          {fechaFin || "hoy"}): {(oeePonderado * 100).toFixed(1)}%
        </div>
      )}

      <div className="mb-4 flex gap-4 items-center">
        <div>
          <label className="font-semibold mr-2">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border p-2"
          />
        </div>
        <div>
          <label className="font-semibold mr-2">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border p-2"
          />
        </div>
        {(fechaInicio || fechaFin) && (
          <button
            onClick={() => {
              setFechaInicio("");
              setFechaFin("");
            }}
            className="ml-2 bg-gray-300 px-3 py-1"
          >
            Quitar filtro
          </button>
        )}
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-max border text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Máquina</th>
              <th className="border p-2">Proceso</th>
              <th className="border p-2">Tiempo Programado</th>
              <th className="border p-2">Paros Planeados</th>
              <th className="border p-2">Paros No Planeados</th>
              <th className="border p-2">Piezas Buenas</th>
              <th className="border p-2">Piezas Malas</th>
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
                  <td className="border p-2">{oee.fecha}</td>
                  <td className="border p-2">{oee.maquina}</td>
                  <td className="border p-2">{oee.proceso}</td>
                  <td className="border p-2">{oee.tiempoProgramado.toFixed(1)}</td>
                  <td className="border p-2">{oee.parosPlaneados}</td>
                  <td className="border p-2">{oee.parosNoPlaneados}</td>
                  <td className="border p-2">{oee.piezasBuenas}</td>
                  <td className="border p-2">{oee.piezasMalas}</td>
                  <td className="border p-2">{oee.tiempoOperativo.toFixed(1)}</td>
                  <td className="border p-2">{oee.perdidaRitmo.toFixed(1)}</td>
                  <td className="border p-2">{oee.tiempoOperativoNeto.toFixed(1)}</td>
                  <td className="border p-2">{oee.perdidasCalidad.toFixed(1)}</td>
                  <td className="border p-2">{oee.tiempoUtil.toFixed(1)}</td>
                  <td className="border p-2">
                    {(oee.disponibilidad * 100).toFixed(1)}%
                  </td>
                  <td className="border p-2">
                    {(oee.desempeno * 100).toFixed(1)}%
                  </td>
                  <td className="border p-2">
                    {(oee.calidad * 100).toFixed(1)}%
                  </td>
                  <td className="border p-2 font-bold">
                    {(oee.oee * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
