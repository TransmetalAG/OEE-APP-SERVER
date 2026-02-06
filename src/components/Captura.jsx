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

  /* ======================
     OPERADOR
  ====================== */
  const handleCodigo = (e) => {
    const codigo = e.target.value;
    const op = operadores.find((o) => o.codigo === codigo);
    setForm({ ...form, codigo, nombre: op ? op.nombre : "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ======================
     PAROS
  ====================== */
  const agregarParo = () => {
    setForm({
      ...form,
      paros: [
        ...form.paros,
        {
          tipo: "",
          origen: "",
          hecho: "",
          accion: "",
          minutos: "",
        },
      ],
    });
  };

  const editarParo = (i, campo, valor) => {
    const copia = [...form.paros];
    copia[i][campo] = valor;
    setForm({ ...form, paros: copia });
  };

  const eliminarParo = (i) => {
    setForm({
      ...form,
      paros: form.paros.filter((_, idx) => idx !== i),
    });
  };

  /* ======================
     GUARDAR
  ====================== */
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
      alert("⚠️ Completa todos los campos de producción.");
      return;
    }

    for (const p of form.paros) {
      if (!p.tipo || !p.minutos || !p.accion) {
        alert("⚠️ Paros incompletos.");
        return;
      }
      if (p.tipo === "No Planeado" && (!p.origen || !p.hecho)) return;
      if (p.tipo !== "No Planeado" && !p.hecho) return;
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

    await supabase.from("registros").insert([registro]);
    alert("✅ Registro guardado");
  };

  /* ======================
     UI
  ====================== */
  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {/* Fecha */}
      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="border p-2 w-full mb-2" />

      {/* Operador */}
      <input placeholder="Código" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />
      <input value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      {/* Máquina */}
      <select value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value, proceso: "", paros: [] })} className="border p-2 w-full mb-2">
        <option value="">Seleccione máquina</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* Proceso */}
      <select name="proceso" value={form.proceso} onChange={handleChange} className="border p-2 w-full mb-2">
        <option value="">Seleccione proceso</option>
        {catalogo.filter((m) => m.maquina === form.maquina).map((m, i) => (
          <option key={i} value={m.proceso}>{m.proceso}</option>
        ))}
      </select>

      {/* Horas */}
      <div className="flex gap-2 mb-2">
        <input type="time" name="inicio" value={form.inicio} onChange={handleChange} className="border p-2 w-full" />
        <input type="time" name="fin" value={form.fin} onChange={handleChange} className="border p-2 w-full" />
      </div>

      <textarea name="comentario_hora" value={form.comentario_hora} onChange={handleChange} placeholder="Comentario horario" className="border p-2 w-full mb-2" />

      {/* Producción */}
      <input type="number" name="carretas" placeholder="Carretas" value={form.carretas} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezastotales" placeholder="Piezas totales" value={form.piezastotales} onChange={handleChange} className="border p-2 w-full mb-2" />
      <input type="number" name="piezasbuenas" placeholder="Piezas buenas" value={form.piezasbuenas} onChange={handleChange} className="border p-2 w-full mb-2" />

      <textarea name="comentario_calidad" value={form.comentario_calidad} onChange={handleChange} placeholder="Comentario producción" className="border p-2 w-full mb-4" />

      {/* PAROS */}
      <h3 className="font-bold mb-2">Paros</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select value={p.tipo} onChange={(e) => editarParo(i, "tipo", e.target.value)} className="border p-2 w-full mb-2">
            <option value="">Tipo de paro</option>
            <option>Planeado</option>
            <option>No Planeado</option>
            <option>Anomalía</option>
          </select>

          {p.tipo === "No Planeado" && (
            <>
              <select value={p.origen} onChange={(e) => editarParo(i, "origen", e.target.value)} className="border p-2 w-full mb-2">
                <option value="">Origen</option>
                <option>Mecánica</option>
                <option>Eléctrica</option>
                <option>Operacional</option>
              </select>

              <select value={p.hecho} onChange={(e) => editarParo(i, "hecho", e.target.value)} className="border p-2 w-full mb-2">
                <option value="">Seleccione paro</option>
                {(catalogoParos[form.maquina] || [])
                  .filter(x => x.causa === p.origen)
                  .map((x, idx) => (
                    <option key={idx} value={x.paro}>{x.paro}</option>
                  ))}
              </select>
            </>
          )}

          {p.tipo !== "No Planeado" && (
            <input placeholder="Hecho" value={p.hecho} onChange={(e) => editarParo(i, "hecho", e.target.value)} className="border p-2 w-full mb-2" />
          )}

          <input placeholder="Acción" value={p.accion} onChange={(e) => editarParo(i, "accion", e.target.value)} className="border p-2 w-full mb-2" />
          <input type="number" placeholder="Minutos" value={p.minutos} onChange={(e) => editarParo(i, "minutos", e.target.value)} className="border p-2 w-full mb-2" />

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
