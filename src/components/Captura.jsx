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

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleCodigo = (e) => {
    const codigo = e.target.value;
    const op = operadores.find((o) => o.codigo === codigo);
    setForm({ ...form, codigo, nombre: op ? op.nombre : "" });
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
          area: "",
          hecho: "",
          causa: "",
          accion: "",
          minutos: "",
        },
      ],
    });
  };

  const editarParo = (i, campo, valor) => {
    const nuevos = [...form.paros];
    nuevos[i][campo] = valor;
    setForm({ ...form, paros: nuevos });
  };

  const eliminarParo = (i) => {
    setForm({ ...form, paros: form.paros.filter((_, idx) => idx !== i) });
  };

  /* =======================
     GUARDAR
  ======================= */

  const guardar = async () => {
    if (!form.maquina || !form.proceso) {
      alert("⚠️ Selecciona máquina y proceso");
      return;
    }

    const registro = {
      ...form,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros.map((p) => ({
        tipo: p.tipo,
        area: p.tipo === "No Planeado" || p.tipo === "Anomalía" ? p.area : null,
        hecho: p.hecho,
        causa: p.causa,
        accion: p.accion,
        minutos: Number(p.minutos),
      })),
    };

    const { error } = await supabase.from("registros").insert([registro]);
    if (error) alert(error.message);
    else alert("✅ Registro guardado");
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Registro de Producción</h2>

      {/* OPERADOR */}
      <input placeholder="Código" value={form.codigo} onChange={handleCodigo} className="border p-2 w-full mb-2" />
      <input value={form.nombre} disabled className="border p-2 w-full mb-2 bg-gray-100" />

      {/* MAQUINA */}
      <select
        value={form.maquina}
        onChange={(e) =>
          setForm({ ...form, maquina: e.target.value, proceso: "", paros: [] })
        }
        className="border p-2 w-full mb-2"
      >
        <option value="">Seleccione máquina</option>
        {[...new Set(catalogo.map((m) => m.maquina))].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      {/* PROCESO */}
      <select
        value={form.proceso}
        name="proceso"
        onChange={handleChange}
        className="border p-2 w-full mb-4"
      >
        <option value="">Seleccione proceso</option>
        {catalogo
          .filter((m) => m.maquina === form.maquina)
          .map((m, i) => (
            <option key={i}>{m.proceso}</option>
          ))}
      </select>

      {/* PAROS */}
      <h3 className="font-bold mb-2">Paros</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select
            value={p.tipo}
            onChange={(e) => editarParo(i, "tipo", e.target.value)}
            className="border p-2 w-full mb-2"
          >
            <option value="">Tipo de paro</option>
            <option>Planeado</option>
            <option>No Planeado</option>
            <option>Anomalía</option>
          </select>

          {(p.tipo === "No Planeado" || p.tipo === "Anomalía") && (
            <>
              <select
                value={p.area}
                onChange={(e) => editarParo(i, "area", e.target.value)}
                className="border p-2 w-full mb-2"
              >
                <option value="">Área</option>
                <option>Mecánica</option>
                <option>Eléctrica</option>
              </select>

              <select
                value={p.hecho}
                onChange={(e) => editarParo(i, "hecho", e.target.value)}
                className="border p-2 w-full mb-2"
              >
                <option value="">Hecho</option>
                {(catalogoParos[form.maquina] || []).map((x, idx) => (
                  <option key={idx}>{x.paro}</option>
                ))}
              </select>

              <input
                placeholder="Causa"
                value={p.causa}
                onChange={(e) => editarParo(i, "causa", e.target.value)}
                className="border p-2 w-full mb-2"
              />

              <input
                placeholder="Acción"
                value={p.accion}
                onChange={(e) => editarParo(i, "accion", e.target.value)}
                className="border p-2 w-full mb-2"
              />
            </>
          )}

          <input
            type="number"
            placeholder="Minutos"
            value={p.minutos}
            onChange={(e) => editarParo(i, "minutos", e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <button onClick={() => eliminarParo(i)} className="bg-red-600 text-white w-full py-1">
            Eliminar
          </button>
        </div>
      ))}

      <button onClick={agregarParo} className="bg-blue-600 text-white px-4 py-2 mb-4">
        + Agregar paro
      </button>

      <button onClick={guardar} className="bg-green-600 text-white w-full py-2">
        Guardar Registro
      </button>
    </div>
  );
}
