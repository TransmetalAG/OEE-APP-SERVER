import React, { useState } from "react";
import { catalogo } from "../data/catalogo";
import { operadores } from "../data/operadores";

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

  // Validar y guardar en localStorage
  const guardar = () => {
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

    const registros = JSON.parse(localStorage.getItem("registros") || "[]");
    registros.push(form);
    localStorage.setItem("registros", JSON.stringify(registros));
    alert("Registro guardado ✅");

    // Reset
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
      <label className="block font-semibold">Proceso / Pieza</label>
      <select
        name="proceso"
        value={form.proceso}
        onChange={handleChange}
        className="border p-2 w-full mb-2 rounded-none"
        disabled={!form.maquina}
      >
        <option value="">Seleccione proceso...</option>
        {catalogo
          .filter((m) => m.maquina === form.maquina)
          .map((m, i) => (
            <option key={i} value={m.proceso}>
              {m.proceso}
            </option>
          ))}
      </select>

      {/* Horarios */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-semibold">Hora Inicio</label>
          <input
            type="time"
            name="inicio"
            value={form.inicio}
            onChange={handleChange}
            className="border p-2 w-full mb-2 rounded-none"
          />
        </div>
        <div className="flex-1">
          <label className="block font-semibold">Hora Fin</label>
          <input
            type="time"
            name="fin"
            value={form.fin}
            onChange={handleChange}
            className="border p-2 w-full mb-2 rounded-none"
          />
        </div>
      </div>

      {/* Carretas */}
      <label className="block font-semibold">Carretas Programadas</label>
      <input
        type="number"
        name="carretas"
        value={form.carretas}
        onChange={handleChange}
        className="border p-2 w-full mb-2 rounded-none"
      />

      {/* Piezas */}
      <label className="block font-semibold">Piezas Totales</label>
      <input
        type="number"
        name="piezasTotales"
        value={form.piezasTotales}
        onChange={handleChange}
        className="border p-2 w-full mb-2 rounded-none"
      />

      <label className="block font-semibold">Piezas Buenas</label>
      <input
        type="number"
        name="piezasBuenas"
        value={form.piezasBuenas}
        onChange={handleChange}
        className="border p-2 w-full mb-2 rounded-none"
      />

      {/* Paros */}
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Paros</h3>

        {form.paros.map((p, i) => (
          <div key={i} className="flex items-center gap-2 border p-2 mb-2">
            <select
              value={p.tipo}
              onChange={(e) => editarParo(i, "tipo", e.target.value)}
              className="border p-2 flex-1 rounded-none"
            >
              <option value="">Seleccione...</option>
              <option value="Mecánico">Mecánico</option>
              <option value="Eléctrico">Eléctrico</option>
              <option value="Planeado">Planeado</option>
              <option value="Otro">Otro</option>
            </select>

            <input
              type="number"
              placeholder="Minutos"
              value={p.minutos}
              onChange={(e) => editarParo(i, "minutos", e.target.value)}
              className="border p-2 w-24 rounded-none"
            />

            <input
              type="text"
              placeholder="Descripción"
              value={p.descripcion}
              onChange={(e) => editarParo(i, "descripcion", e.target.value)}
              className="border p-2 flex-1 rounded-none"
            />

            <button
              onClick={() => eliminarParo(i)}
              className="bg-red-600 text-white px-3 py-1 rounded-none"
            >
              Eliminar
            </button>
          </div>
        ))}

        <button
          onClick={agregarParo}
          className="bg-blue-600 text-white px-4 py-2 rounded-none"
        >
          + Agregar paro
        </button>
      </div>

      {/* Botón Guardar */}
      <button
        onClick={guardar}
        className="bg-green-600 text-white px-4 py-2 rounded-none mt-4"
      >
        Guardar Registro
      </button>
    </div>
  );
}
