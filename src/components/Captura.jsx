import React, { useState } from "react";
import { catalogo } from "../data/catalogo";
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
    piezasTotales: "",
    piezasBuenas: "",
    paros: [],
  });

  // Cambios generales
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Buscar operador por código
  const handleCodigo = (e) => {
    const codigo = e.target.value;
    const op = operadores.find((o) => o.codigo === codigo);
    setForm({
      ...form,
      codigo,
      nombre: op ? op.nombre : "",
    });
  };

  // Agregar un paro vacío
  const agregarParo = () => {
    setForm({
      ...form,
      paros: [...form.paros, { tipo: "", minutos: "", descripcion: "" }],
    });
  };

  // Editar un paro
  const editarParo = (index, field, value) => {
    const nuevosParos = form.paros.map((paro, i) =>
      i === index ? { ...paro, [field]: value } : paro
    );
    setForm({ ...form, paros: nuevosParos });
  };

  // Eliminar un paro
  const eliminarParo = (i) => {
    setForm({ ...form, paros: form.paros.filter((_, idx) => idx !== i) });
  };

  // Validar y guardar en Supabase
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
      !form.piezasTotales ||
      !form.piezasBuenas
    ) {
      alert("⚠️ Debes completar todos los campos antes de guardar.");
      return;
    }

    // Validar que los paros tengan datos completos
    for (let paro of form.paros) {
      if (!paro.tipo || !paro.minutos || !paro.descripcion) {
        alert("⚠️ Completa todos los campos de cada paro o elimínalos.");
        return;
      }
    }

    // Insertar en Supabase
    const { error } = await supabase.from("registros").insert([
      {
        fecha: form.fecha,
        codigo: form.codigo,
        nombre: form.nombre,
        maquina: form.maquina,
        proceso: form.proceso,
        inicio: form.inicio,
        fin: form.fin,
        carretas: Number(form.carretas),
        piezasTotales: Number(form.piezasTotales),
        piezasBuenas: Number(form.piezasBuenas),
        paros: form.paros, // JSON válido
      },
    ]);

    if (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar en la base de datos.");
      return;
    }

    alert("Registro guardado ✅");

    // Resetear formulario
    setForm({
      fecha: new Date().toISOString().split("T")[0],
      codigo: "",
      nombre: "",
      maquina: "",
      proceso: "",
      inicio: "",
      fin: "",
      carretas: "",
      piezasTotales: "",
      piezasBuenas: "",
      paros: [],
    });
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {/* Fecha */}
      <label className="block font-semibold">Fecha</label>
      <input
        type="date"
        name="fecha"
        value={form.fecha}
        onChange={handleChange}
        className="border p-2 w-full mb-2 rounded-none"
      />

      {/* Código operador */}
      <label className="block font-semibold">Código de Operador</label>
      <input
        type="text"
        name="codigo"
        value={form.codigo}
        onChange={handleCodigo}
        className="border p-2 w-full mb-2 rounded-none"
      />

      <label className="block font-semibold">Nombre</label>
      <input
        type="text"
        value={form.nombre}
        disabled
        className="border p-2 w-full mb-2 bg-gray-100 rounded-none"
      />

      {/* Máquina */}
      <label className="block font-semibold">Máquina</label>
      <select
        name="maquina"
        value={form.maquina}
        onChange={(e) =>
          setForm({ ...form, maquina: e.target.value, proceso: "" })
        }
        className="border p-2 w-full mb-2 rounded-none"
      >
        <option value="">Seleccione máquina...</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((maq, i) => (
          <option key={i} value={maq}>
            {maq}
          </option>
        ))}
      </select>

      {/* Proceso */}
      <label c
