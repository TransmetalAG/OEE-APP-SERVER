import React, { useEffect, useState } from "react";
import { catalogo } from "../data/catalogo";
import { operadores } from "../data/operadores";
import { catalogoParos } from "../data/catalogoParos";
import { supabase } from "../supabaseClient";

const FORM_INICIAL = {
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
};

export default function Captura() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [isSaving, setIsSaving] = useState(false);

  /* =======================
     HANDLERS GENERALES
  ======================= */

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
        {
          tipo: "",
          origen: "",
          hecho: "",
          causa: "",
          accion: "",
          minutos: "",
          comentario: "",
        },
      ],
    });
  };

  const editarParo = (i, campo, valor) => {
    const nuevos = [...form.paros];
    nuevos[i][campo] = valor;

    if (campo === "tipo") {
      nuevos[i] = {
        tipo: valor,
        origen: "",
        hecho: "",
        causa: "",
        accion: "",
        minutos: "",
        comentario: "",
      };
    }

    if (campo === "origen") {
      nuevos[i].hecho = "";
    }

    setForm({ ...form, paros: nuevos });
  };

  const eliminarParo = (i) => {
    setForm({
      ...form,
      paros: form.paros.filter((_, idx) => idx !== i),
    });
  };

  /* =======================
     GUARDAR (ANTI DUPLICADOS)
  ======================= */

  const guardar = async () => {
    if (isSaving) return; // 🔒 evita doble click
    setIsSaving(true);

    // Validación paros
    for (const p of form.paros) {
      if (!p.tipo || !p.minutos || !p.comentario) {
        alert("⚠️ Todos los paros deben llevar minutos y comentario.");
        setIsSaving(false);
        return;
      }

      if (
        p.tipo === "No Planeado" &&
        (!p.origen || !p.hecho || !p.causa || !p.accion)
      ) {
        alert("⚠️ Paro no planeado incompleto.");
        setIsSaving(false);
        return;
      }

      if (
        p.tipo === "Anomalía" &&
        (!p.hecho || !p.causa || !p.accion)
      ) {
        alert("⚠️ Anomalía incompleta.");
        setIsSaving(false);
        return;
      }
    }

    const registro = {
      ...form,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros.map((p) => ({
        ...p,
        minutos: Number(p.minutos),
      })),
    };

    try {
      const { error } = await supabase.from("registros").insert([registro]);
      if (error) throw error;

      alert("✅ Registro guardado correctamente");

      // 🧼 RESET TOTAL DEL FORM
      setForm({
        ...FORM_INICIAL,
        fecha: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      alert("❌ Error guardando registro");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input placeholder="Código operador" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />
      <input value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      <select value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value, proceso: "", paros: [] })} className="border p-2 w-full mb-2">
        <option value="">Seleccione máquina...</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select value={form.proceso} name="proceso" onChange={handleChange} disabled={!form.maquina} className="border p-2 w-full mb-2">
        <option value="">Seleccione proceso...</option>
        {catalogo.filter((m) => m.maquina === form.maquina).map((m) => (
          <option key={m.proceso} value={m.proceso}>{m.proceso}</option>
        ))}
      </select>

      <div className="flex gap-2 mb-2">
        <input type="time" name="inicio" value={form.inicio} onChange={handleChange} className="border p-2 w-full" />
        <input type="time" name="fin" value={form.fin} onChange={handleChange} className="border p-2 w-full" />
      </div>

      <input type="number" name="carretas" placeholder="Carretas" value={form.carretas} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezastotales" placeholder="Piezas totales" value={form.piezastotales} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezasbuenas" placeholder="Piezas buenas" value={form.piezasbuenas} onChange={handleChange} className="border p-2 w-full mb-4" />

      <button
        onClick={guardar}
        disabled={isSaving}
        className={`text-white px-4 py-2 w-full ${
          isSaving ? "bg-gray-400" : "bg-green-600"
        }`}
      >
        {isSaving ? "Guardando..." : "Guardar Registro"}
      </button>
    </div>
  );
}
