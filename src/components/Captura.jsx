import React, { useEffect, useState } from "react";
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
    comentario_hora: "",
    comentario_calidad: "",
    paros: [],
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

  /* =======================
     PAROS (HCA)
  ======================= */

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
    const nuevos = [...form.paros];
    nuevos[index][field] = value;
    setForm({ ...form, paros: nuevos });
  };

  const eliminarParo = (index) => {
    setForm({
      ...form,
      paros: form.paros.filter((_, i) => i !== index),
    });
  };

  /* =======================
     GUARDAR
  ======================= */

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
      alert("⚠️ Completa todos los campos obligatorios.");
      return;
    }

    for (const p of form.paros) {
      if (!p.hecho || !p.causa || !p.accion || !p.minutos) {
        alert("⚠️ Completa todos los campos de los paros.");
        return;
      }
    }

    const registro = {
      ...form,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros.map((p) => ({
        hecho: p.hecho,
        causa: p.causa,
        accion: p.accion,
        minutos: Number(p.minutos),
      })),
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
      comentario_hora: "",
      comentario_calidad: "",
      paros: [],
    });
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {/* Fecha */}
      <label>Fecha</label>
      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />

      {/* Operador */}
      <label>Código Operador</label>
      <input value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />

      <label>Nombre</label>
      <input value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      {/* Máquina */}
      <label>Máquina</label>
      <select
        value={form.maquina}
        onChange={(e) =>
          setForm({ ...form, maquina: e.target.value, proceso: "", paros: [] })
        }
        className="border p-2 w-full mb-2"
      >
        <option value="">Seleccione máquina...</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m, i) => (
          <option key={i} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* Proceso */}
      <label>Proceso</label>
      <select
        value={form.proceso}
        onChange={handleChange}
        name="proceso"
        className="border p-2 w-full mb-2"
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

      {/* Horas */}
      <div className="flex gap-2">
        <input type="time" name="inicio" value={form.inicio} onChange={handleChange} className="border p-2 w-full" />
        <input type="time" name="fin" value={form.fin} onChange={handleChange} className="border p-2 w-full" />
      </div>

      <textarea
        name="comentario_hora"
        value={form.comentario_hora}
        onChange={handleChange}
        className="border p-2 w-full my-2"
        placeholder="Comentario de horario"
      />

      {/* Producción */}
      <input type="number" name="carretas" placeholder="Carretas" value={form.carretas} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezastotales" placeholder="Piezas Totales" value={form.piezastotales} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezasbuenas" placeholder="Piezas Buenas" value={form.piezasbuenas} onChange={handleChange} className="border p-2 w-full mb-2" />

      <textarea
        name="comentario_calidad"
        value={form.comentario_calidad}
        onChange={handleChange}
        className="border p-2 w-full mb-4"
        placeholder="Comentario de producción"
      />

      {/* HCA */}
      <h3 className="font-bold mb-2">Paros (HCA)</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select
            value={p.hecho}
            onChange={(e) => editarParo(i, "hecho", e.target.value)}
            className="border p-2 w-full mb-2"
          >
            <option value="">Seleccione paro...</option>
            {(catalogoParos[form.maquina] || []).map((x, idx) => (
              <option key={idx} value={x.paro}>
                {x.paro}
              </option>
            ))}
          </select>

          <input
            placeholder="Causa (qué pasó)"
            value={p.causa}
            onChange={(e) => editarParo(i, "causa", e.target.value)}
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
            placeholder="Tiempo (min)"
            value={p.minutos}
            onChange={(e) => editarParo(i, "minutos", e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <button onClick={() => eliminarParo(i)} className="bg-red-600 text-white px-3 py-1 w-full">
            Eliminar paro
          </button>
        </div>
      ))}

      <button onClick={agregarParo} className="bg-blue-600 text-white px-4 py-2 mb-4">
        + Agregar paro
      </button>

      <button onClick={guardar} className="bg-green-600 text-white px-4 py-2 w-full">
        Guardar Registro
      </button>
    </div>
  );
}
