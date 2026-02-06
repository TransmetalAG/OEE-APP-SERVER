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

  /* =========================
     PAROS HCA
     ========================= */

  const agregarParo = () => {
    setForm({
      ...form,
      paros: [
        ...form.paros,
        { hecho: "", causa: "", accion: "", minutos: "" },
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
      alert("⚠️ Debes completar todos los campos antes de guardar.");
      return;
    }

    for (let paro of form.paros) {
      if (!paro.hecho || !paro.causa || !paro.accion || !paro.minutos) {
        alert("⚠️ Completa Hecho, Causa, Acción y Tiempo en cada paro.");
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

  const sincronizarPendientes = async () => {
    const guardados =
      JSON.parse(localStorage.getItem("capturasPendientes")) || [];
    if (guardados.length === 0) return;

    for (const registro of guardados) {
      await supabase.from("registros").insert([registro]);
    }

    localStorage.removeItem("capturasPendientes");
    setPendientes([]);
    alert("✅ Registros sincronizados");
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {pendientes.length > 0 && (
        <div className="bg-yellow-100 p-2 mb-4">
          ⚠️ Hay registros pendientes
          <button
            onClick={sincronizarPendientes}
            className="ml-3 bg-yellow-600 text-white px-3 py-1"
          >
            Sincronizar
          </button>
        </div>
      )}

      {/* === DATOS GENERALES === */}
      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="text" placeholder="Código operador" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />
      <input type="text" value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      <select
        value={form.maquina}
        onChange={(e) => setForm({ ...form, maquina: e.target.value, proceso: "" })}
        className="border p-2 w-full mb-2"
      >
        <option value="">Seleccione máquina...</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m, i) => (
          <option key={i} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={form.proceso}
        onChange={handleChange}
        name="proceso"
        disabled={!form.maquina}
        className="border p-2 w-full mb-2"
      >
        <option value="">Seleccione proceso...</option>
        {catalogo.filter(m => m.maquina === form.maquina).map((m, i) => (
          <option key={i} value={m.proceso}>{m.proceso}</option>
        ))}
      </select>

      {/* === PAROS HCA === */}
      <h3 className="font-semibold mt-4 mb-2">Paros (HCA)</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select
            value={p.hecho}
            onChange={(e) => editarParo(i, "hecho", e.target
