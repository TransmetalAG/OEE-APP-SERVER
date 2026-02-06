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

  /* =======================
     OPERADOR
  ======================= */
  const handleCodigo = (e) => {
    const codigo = e.target.value;
    const op = operadores.find((o) => o.codigo === codigo);
    setForm({ ...form, codigo, nombre: op ? op.nombre : "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =======================
     PAROS
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
        },
      ],
    });
  };

  const editarParo = (i, campo, valor) => {
    const copia = [...form.paros];
    copia[i][campo] = valor;

    // Reset cascada
    if (campo === "tipo") {
      copia[i].origen = "";
      copia[i].hecho = "";
    }
    if (campo === "origen") {
      copia[i].hecho = "";
    }

    setForm({ ...form, paros: copia });
  };

  const eliminarParo = (i) => {
    setForm({
      ...form,
      paros: form.paros.filter((_, idx) => idx !== i),
    });
  };

  /* =======================
     GUARDAR
  ======================= */
  const guardar = async () => {
    for (const p of form.paros) {
      if (!p.tipo || !p.causa || !p.accion || !p.minutos) {
        alert("⚠️ Completa todos los campos del paro");
        return;
      }
      if (p.tipo !== "Planeado" && !p.origen) {
        alert("⚠️ Selecciona origen del paro");
        return;
      }
      if (p.tipo !== "Planeado" && !p.hecho) {
        alert("⚠️ Selecciona el paro");
        return;
      }
    }

    const registro = {
      ...form,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros.map((p) => ({
        tipo: p.tipo,
        origen: p.origen,
        hecho: p.hecho,
        causa: p.causa,
        accion: p.accion,
        minutos: Number(p.minutos),
      })),
    };

    await supabase.from("registros").insert([registro]);
    alert("✅ Registro guardado");
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />

      <input placeholder="Código" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />
      <input value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      <select value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value, proceso: "", paros: [] })} className="border p-2 w-full mb-2">
        <option value="">Seleccione máquina</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select value={form.proceso} name="proceso" onChange={handleChange} disabled={!form.maquina} className="border p-2 w-full mb-2">
        <option value="">Seleccione proceso</option>
        {catalogo.filter((m) => m.maquina === form.maquina).map((m) => (
          <option key={m.proceso} value={m.proceso}>{m.proceso}</option>
        ))}
      </select>

      <h3 className="font-bold mt-4">Paros</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 my-3">
          <select value={p.tipo} onChange={(e) => editarParo(i, "tipo", e.target.value)} className="border p-2 w-full mb-2">
            <option value="">Seleccione tipo de paro</option>
            <option value="Planeado">Planeado</option>
            <option value="No Planeado">No Planeado</option>
            <option value="Anomalía">Anomalía</option>
          </select>

          {p.tipo !== "Planeado" && (
            <select value={p.origen} onChange={(e) => editarParo(i, "origen", e.target.value)} className="border p-2 w-full mb-2">
              <option value="">Seleccione origen</option>
              <option value="Mecánica">Mecánica</option>
              <option value="Eléctrica">Eléctrica</option>
              <option value="Operacional">Operacional</option>
            </select>
          )}

          {p.tipo !== "Planeado" && (
            <select value={p.hecho} onChange={(e) => editarParo(i, "hecho", e.target.value)} className="border p-2 w-full mb-2">
              <option value="">Seleccione paro</option>
              {(catalogoParos[form.maquina] || [])
                .filter((x) => x.causa === p.origen)
                .map((x, idx) => (
                  <option key={idx} value={x.paro}>{x.paro}</option>
                ))}
            </select>
          )}

          <input placeholder="Causa" value={p.causa} onChange={(e) => editarParo(i, "causa", e.target.value)} className="border p-2 w-full mb-2" />
          <input placeholder="Acción" value={p.accion} onChange={(e) => editarParo(i, "accion", e.target.value)} className="border p-2 w-full mb-2" />
          <input type="number" placeholder="Minutos" value={p.minutos} onChange={(e) => editarParo(i, "minutos", e.target.value)} className="border p-2 w-full mb-2" />

          <button onClick={() => eliminarParo(i)} className="bg-red-600 text-white w-full py-1">Eliminar paro</button>
        </div>
      ))}

      <button onClick={agregarParo} className="bg-blue-600 text-white px-4 py-2 mb-3">+ Agregar paro</button>
      <button onClick={guardar} className="bg-green-600 text-white w-full py-2">Guardar Registro</button>
    </div>
  );
}
