import React, { useState, useEffect } from "react";
import { catalogo } from "../data/catalogo";
import { catalogoParos } from "../data/catalogoParos";
import { operadores } from "../data/operadores";
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
        { paro: "", causa_operador: "", accion: "", minutos: "" },
      ],
    });
  };

  const editarParo = (index, field, value) => {
    const nuevosParos = form.paros.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    setForm({ ...form, paros: nuevosParos });
  };

  const eliminarParo = (index) => {
    setForm({
      ...form,
      paros: form.paros.filter((_, i) => i !== index),
    });
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
      alert("⚠️ Completa todos los campos principales.");
      return;
    }

    for (let p of form.paros) {
      if (!p.paro || !p.causa_operador || !p.accion || !p.minutos) {
        alert("⚠️ Completa todos los campos de cada paro.");
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
      paros: form.paros.map((p) => ({
        paro: p.paro,
        causa_operador: p.causa_operador,
        accion: p.accion,
        minutos: Number(p.minutos),
      })),
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
      alert("📦 Guardado localmente (sin conexión)");
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

      {pendientes.length > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-4">
          ⚠️ Hay {pendientes.length} registros pendientes
        </div>
      )}

      {/* DATOS GENERALES */}
      <label className="font-semibold">Fecha</label>
      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />

      <label className="font-semibold">Código Operador</label>
      <input type="text" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />

      <label className="font-semibold">Nombre</label>
      <input type="text" value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      <label className="font-semibold">Máquina</label>
      <select
        value={form.maquina}
        onChange={(e) => setForm({ ...form, maquina: e.target.value, proceso: "" })}
        className="border p-2 w-full mb-2"
      >
        <option value="">Seleccione...</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m, i) => (
          <option key={i}>{m}</option>
        ))}
      </select>

      <label className="font-semibold">Proceso</label>
      <select
        value={form.proceso}
        onChange={handleChange}
        name="proceso"
        className="border p-2 w-full mb-2"
        disabled={!form.maquina}
      >
        <option value="">Seleccione...</option>
        {catalogo.filter((m) => m.maquina === form.maquina).map((m, i) => (
          <option key={i}>{m.proceso}</option>
        ))}
      </select>

      {/* PAROS */}
      <h3 className="font-bold mt-4 mb-2">Paros (HCA)</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select
            value={p.paro}
            onChange={(e) => editarParo(i, "paro", e.target.value)}
            className="border p-2 w-full mb-2"
          >
            <option value="">Seleccione paro...</option>
            {(catalogoParos[form.maquina] || []).map((x, idx) => (
              <option key={idx} value={x.paro}>{x.paro}</option>
            ))}
          </select>

          <input
            placeholder="Causa (¿por qué pasó?)"
            value={p.causa_operador}
            onChange={(e) => editarParo(i, "causa_operador", e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <input
            placeholder="Acción realizada"
            value={p.accion}
            onChange={(e) => editarParo(i, "accion", e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <input
            type="number"
            placeholder="Minutos"
            value={p.minutos}
            onChange={(e) => editarParo(i, "minutos", e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <button onClick={() => eliminarParo(i)} className="bg-red-600 text-white px-3 py-1 w-full">
            Eliminar paro
          </button>
        </div>
      ))}

      <button onClick={agregarParo} className="bg-blue-600 text-white px-4 py-2">
        + Agregar paro
      </button>

      <button onClick={guardar} className="bg-green-600 text-white px-4 py-2 mt-4 w-full">
        Guardar registro
      </button>
    </div>
  );
}
