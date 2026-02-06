import React, { useState, useEffect } from "react";
import { catalogo } from "../data/catalogo";
import { operadores } from "../data/operadores";
import { catalogoParos } from "../data/catalogoParos";
import { supabase } from "../supabaseClient";

export default function Captura() {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    codigo: "",
    nombre: "",
    maquina: "",
    proceso: "",
    inicio: "",
    fin: "",
    carretas: "",
    piezastotales: "",
    piezasbuenas: "",
    paros: [],
    comentario_hora: "",
    comentario_calidad: "",
  });

  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    const guardados =
      JSON.parse(localStorage.getItem("capturasPendientes")) || [];
    setPendientes(guardados);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCodigo = (e) => {
    const codigo = e.target.value;
    const op = operadores.find((o) => o.codigo === codigo);
    setForm({
      ...form,
      codigo,
      nombre: op ? op.nombre : "",
    });
  };

  const agregarParo = () => {
    setForm({
      ...form,
      paros: [
        ...form.paros,
        {
          hecho: "",
          causa: "",
          accion: "",
          minutos: "",
          clasificacion: "",
        },
      ],
    });
  };

  const editarParo = (index, field, value) => {
    const nuevosParos = form.paros.map((paro, i) =>
      i === index ? { ...paro, [field]: value } : paro
    );
    setForm({ ...form, paros: nuevosParos });
  };

  const eliminarParo = (i) => {
    setForm({ ...form, paros: form.paros.filter((_, idx) => idx !== i) });
  };

  const guardar = async () => {
    if (
      !form.fecha ||
      !form.codigo ||
      !form.nombre ||
      !form.maquina ||
      !form.proceso ||
      !form.inicio ||
      !form.fin ||
      !form.carretas ||
      !form.piezastotales ||
      !form.piezasbuenas
    ) {
      alert("⚠️ Debes completar todos los campos antes de guardar.");
      return;
    }

    for (let paro of form.paros) {
      if (!paro.hecho || !paro.causa || !paro.accion || !paro.minutos) {
        alert(
          "⚠️ En cada paro debes completar Hecho, Causa, Acción y Tiempo (min)."
        );
        return;
      }
    }

    const registro = {
      fecha: form.fecha,
      codigo: form.codigo,
      nombre: form.nombre,
      maquina: form.maquina,
      proceso: form.proceso,
      inicio: form.inicio,
      fin: form.fin,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros,
      comentario_hora: form.comentario_hora,
      comentario_calidad: form.comentario_calidad,
    };

    try {
      const { error } = await supabase.from("registros").insert([registro]);
      if (error) throw error;
      alert("✅ Registro guardado en Supabase");
    } catch (err) {
      const pendientesActuales =
        JSON.parse(localStorage.getItem("capturasPendientes")) || [];
      pendientesActuales.push(registro);
      localStorage.setItem(
        "capturasPendientes",
        JSON.stringify(pendientesActuales)
      );
      setPendientes(pendientesActuales);
      alert("📦 Registro guardado localmente (sin conexión)");
    }

    setForm({
      fecha: new Date().toISOString().split("T")[0],
      codigo: "",
      nombre: "",
      maquina: "",
      proceso: "",
      inicio: "",
      fin: "",
      carretas: "",
      piezastotales: "",
      piezasbuenas: "",
      paros: [],
      comentario_hora: "",
      comentario_calidad: "",
    });
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {/* Paros */}
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Paros</h3>

        {form.paros.map((p, i) => (
          <div key={i} className="border p-3 mb-3 rounded">
            <label className="font-semibold">Hecho (Paro)</label>
            <select
              value={p.hecho}
              onChange={(e) => {
                const hecho = e.target.value;
                const data = catalogoParos[form.maquina]?.find(
                  (x) => x.paro === hecho
                );
                editarParo(i, "hecho", hecho);
                editarParo(i, "clasificacion", data?.causa || "");
              }}
              className="border p-2 w-full mb-2"
              disabled={!form.maquina}
            >
              <option value="">Seleccione paro...</option>
              {(catalogoParos[form.maquina] || []).map((p, idx) => (
                <option key={idx} value={p.paro}>
                  {p.paro}
                </option>
              ))}
            </select>

            <label className="font-semibold">Causa</label>
            <input
              type="text"
              value={p.causa}
              onChange={(e) => editarParo(i, "causa", e.target.value)}
              className="border p-2 w-full mb-2"
            />

            <label className="font-semibold">Acción</label>
            <input
              type="text"
              value={p.accion}
              onChange={(e) => editarParo(i, "accion", e.target.value)}
              className="border p-2 w-full mb-2"
            />

            <label className="font-semibold">Tiempo (min)</label>
            <input
              type="number"
              value={p.minutos}
              onChange={(e) => editarParo(i, "minutos", e.target.value)}
              className="border p-2 w-32"
            />

            {p.clasificacion && (
              <div className="text-sm text-gray-600 mt-1">
                Clasificación: <strong>{p.clasificacion}</strong>
              </div>
            )}

            <button
              onClick={() => eliminarParo(i)}
              className="bg-red-600 text-white px-3 py-1 mt-2"
            >
              Eliminar
            </button>
          </div>
        ))}

        <button
          onClick={agregarParo}
          className="bg-blue-600 text-white px-4 py-2"
        >
          + Agregar paro
        </button>
      </div>

      <button
        onClick={guardar}
        className="bg-green-600 text-white px-4 py-2 mt-4"
      >
        Guardar Registro
      </button>
    </div>
  );
}
