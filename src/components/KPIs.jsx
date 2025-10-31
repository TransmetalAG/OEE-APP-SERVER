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

  // 🔹 Cargar datos desde Supabase
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

  // 🔹 Función de cálculo OEE por registro
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
      ? r.paros.filter((p) => p.tipo === "Planeado").reduce((a, b) => a + Number(b.minutos || 0), 0)
      : 0;

    const parosNoPlaneados = r.paros
      ? r.paros.filter((p) => p.tipo !== "Planeado").reduce((a, b) => a + Number(b.minutos || 0), 0)
      : 0;

    const piezasMalas = r.piezastotales - r.piezasbuenas;

    const tiempoOperativo = tiempoProgramado - parosNoPlaneados - parosPlaneados;
    const tiempoOperativoNeto = r.piezastotales / eph;
    const perdidaRitmo = tiempoOperativo - tiempoOperativoNeto;
    const perdidasCalidad = piezasMalas / eph;
    const tiempoUtil = tiempoOperativoNeto - perdidasCalidad;

    const disponibilidad = tiempoOperativo / tiempoProgramado;
    const desempeno = tiempoOperativo > 0 ? Math.min(tiempoOperativoNeto / tiempoOperativo, 1) : 0;
    const calidad = tiempoOperativoNeto > 0 ? tiempoUtil / tiempoOperativoNeto : 0;

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
  };

  // 🔹 Filtros de fecha
  const registrosFiltrados = registros.filter((r) => {
    if (fechaInicio && r.fecha < fechaInicio) return false;
    if (fechaFin && r.fecha > fechaFin) return false;
    return true;
  });

  // 🔹 Cálculos globales ponderados
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

  const calcularDisponibilidadPonderada = () => {
    let totalProgramado = 0;
    let totalOperativo = 0;
    registrosFiltrados.forEach((r) => {
      const oee = calcularOEE(r);
      if (oee) {
        totalOperativo += oee.tiempoOperativo;
        totalProgramado += oee.tiempoProgramado;
      }
    });
    return totalProgramado > 0 ? totalOperativo / totalProgramado : null;
  };

  const calcularDesempenoPonderado = () => {
    let totalOperativo = 0;
    let totalNeto = 0;
    registrosFiltrados.forEach((r) => {
      const oee = calcularOEE(r);
      if (oee) {
        totalNeto += oee.tiempoOperativoNeto;
        totalOperativo += oee.tiempoOperativo;
      }
    });
    return totalOperativo > 0 ? totalNeto / totalOperativo : null;
  };

  const calcularCalidadPonderada = () => {
    let totalNeto = 0;
    let totalUtil = 0;
    registrosFiltrados.forEach((r) => {
      const oee = calcularOEE(r);
      if (oee) {
        totalUtil += oee.tiempoUtil;
        totalNeto += oee.tiempoOperativoNeto;
      }
    });
    return totalNeto > 0 ? totalUtil / totalNeto : null;
  };

  const oeePonderado = calcularOEEPonderado();
  const disponibilidadPonderada = calcularDisponibilidadPonderada();
  const desempenoPonderado = calcularDesempenoPonderado();
  const calidadPonderada = calcularCalidadPonderada();

  // 🔹 Exportar Excel
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
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `OEE_${fecha}.xlsx`);
  };

  if (loading) return <p className="p-4">⏳ Cargando datos...</p>;

  if (registros.length === 0) {
    return (
      <div className="p-4">
        <p>No hay datos registrados todavía.</p>
        <button onClick={fetchData} className="mt-2 bg-blue-600 text-white px-4 py-2">
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
          <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-none">
            🔄 Refrescar
          </button>
          <button onClick={exportarExcel} className="bg-green-600 text-white px-4 py-2 rounded-none">
            📤 Exportar Excel
          </button>
        </div>
      </div>

      {/* KPIs globales */}
      <div className="mb-4 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {oeePonderado !== null && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 font-semibold rounded">
            📊 OEE Ponderado: {(oeePonderado * 100).toFixed(1)}%
          </div>
        )}
        {disponibilidadPonderada !== null && (
          <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 font-semibold rounded">
            ⏱️ Disponibilidad: {(disponibilidadPonderada * 100).toFixed(1)}%
          </div>
        )}
        {desempenoPonderado !== null && (
          <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 font-semibold rounded">
            ⚙️ Desempeño: {(desempenoPonderado * 100).toFixed(1)}%
          </div>
        )}
        {calidadPonderada !== null && (
          <div className="p-3 bg-purple-100 border border-purple-400 text-purple-700 font-semibold rounded">
            🧩 Calidad: {(calidadPonderada * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Tabla de resultados */}
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

          {/* 🔹 Cuerpo con fila total incluida */}
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
                  <td className="border p-2">{(oee.disponibilidad * 100).toFixed(1)}%</td>
                  <td className="border p-2">{(oee.desempeno * 100).toFixed(1)}%</td>
                  <td className="border p-2">{(oee.calidad * 100).toFixed(1)}%</td>
                  <td className="border p-2 font-bold">{(oee.oee * 100).toFixed(1)}%</td>
                </tr>
              );
            })}

            {/* 🔹 Fila TOTAL */}
            {(() => {
              const acumulados = registrosFiltrados
                .map((r) => calcularOEE(r))
                .filter(Boolean)
                .reduce(
                  (acc, oee) => ({
                    tiempoProgramado: acc.tiempoProgramado + oee.tiempoProgramado,
                    parosPlaneados: acc.parosPlaneados + oee.parosPlaneados,
                    parosNoPlaneados: acc.parosNoPlaneados + oee.parosNoPlaneados,
                    tiempoOperativo: acc.tiempoOperativo + oee.tiempoOperativo,
                    perdidaRitmo: acc.perdidaRitmo + oee.perdidaRitmo,
                    tiempoOperativoNeto: acc.tiempoOperativoNeto + oee.tiempoOperativoNeto,
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

              return (
                <tr className="font-bold bg-gray-200 sticky bottom-0">
                  <td className="border p-2 text-center" colSpan={3}>
                    TOTAL
                  </td>
                  <td className="border p-2">{acumulados.tiempoProgramado.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.parosPlaneados.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.parosNoPlaneados.toFixed(1)}</td>
                  <td className="border p-2" colSpan={2}></td>
                  <td className="border p-2">{acumulados.tiempoOperativo.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.perdidaRitmo.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.tiempoOperativoNeto.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.perdidasCalidad.toFixed(1)}</td>
                  <td className="border p-2">{acumulados.tiempoUtil.toFixed(1)}</td>
                  <td colSpan={4} className="border p-2 text-center text-gray-600">
                    ⬆️ Suma de tiempos globales usados para OEE
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
