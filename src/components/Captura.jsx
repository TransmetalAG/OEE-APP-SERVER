import React, { useEffect, useState } from "react";
import { catalogo } from "../data/catalogo";
import { operadores } from "../data/operadores";
import { catalogoParos } from "../data/catalogoParos";
import { supabase } from "../supabaseClient";

export default function Captura() {
  const [pendientes, setPendientes] = useState([]);

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
  });

  useEffect(() => {
    const guardados =
      JSON.parse(localStorage.getItem("capturasPendientes")) || [];
    setPendientes(guardados);
  }, []);

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
     GUARDAR
  ======================= */

  const guardar = async () => {
    for (const p of form.paros) {
      if (!p.tipo || !p.minutos || !p.comentario) {
        alert("⚠️ Todos los paros deben llevar minutos y comentario.");
        return;
      }

      if (
        p.tipo === "No Planeado" &&
        (!p.origen || !p.hecho || !p.causa || !p.accion)
      ) {
        alert("⚠️ Paro no planeado incompleto.");
        return;
      }

      if (
        p.tipo === "Anomalía" &&
        (!p.hecho || !p.causa || !p.accion)
      ) {
        alert("⚠️ Anomalía incompleta.");
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
      alert("✅ Registro guardado");
    } catch {
      const pendientesActuales =
        JSON.parse(localStorage.getItem("capturasPendientes")) || [];
      pendientesActuales.push(registro);
      localStorage.setItem(
        "capturasPendientes",
        JSON.stringify(pendientesActuales)
      );
      setPendientes(pendientesActuales);
      alert("📦 Guardado local");
    }

    setForm({ ...form, paros: [] });
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

      <h3 className="font-bold mb-2">Paros (HCA)</h3>

      {form.paros.map((p, i) => (
        <div key={i} className="border p-3 mb-3">
          <select value={p.tipo} onChange={(e) => editarParo(i, "tipo", e.target.value)} className="border p-2 w-full mb-2">
            <option value="">Tipo de paro...</option>
            <option value="Planeado">Planeado</option>
            <option value="No Planeado">No Planeado</option>
            <option value="Anomalía">Anomalía</option>
          </select>

          {p.tipo === "No Planeado" && (
            <>
              <select value={p.origen} onChange={(e) => editarParo(i, "origen", e.target.value)} className="border p-2 w-full mb-2">
                <option value="">Origen...</option>
                <option value="Mecánica">Mecánica</option>
                <option value="Eléctrica">Eléctrica</option>
                <option value="Operacional">Operacional</option>
              </select>

              {p.origen && (
                <select value={p.hecho} onChange={(e) => editarParo(i, "hecho", e.target.value)} className="border p-2 w-full mb-2">
                  <option value="">Seleccione paro...</option>
                  {(catalogoParos[form.maquina] || [])
                    .filter((x) => x.causa === p.origen)
                    .map((x, idx) => (
                      <option key={idx} value={x.paro}>{x.paro}</option>
                    ))}
                </select>
              )}
            </>
          )}

          {p.tipo === "Anomalía" && (
            <input placeholder="Hecho" value={p.hecho} onChange={(e) => editarParo(i, "hecho", e.target.value)} className="border p-2 w-full mb-2" />
          )}

          {(p.tipo === "No Planeado" || p.tipo === "Anomalía") && (
            <>
              <input placeholder="Causa" value={p.causa} onChange={(e) => editarParo(i, "causa", e.target.value)} className="border p-2 w-full mb-2" />
              <input placeholder="Acción" value={p.accion} onChange={(e) => editarParo(i, "accion", e.target.value)} className="border p-2 w-full mb-2" />
            </>
          )}

          <input type="number" placeholder="Minutos" value={p.minutos} onChange={(e) => editarParo(i, "minutos", e.target.value)} className="border p-2 w-full mb-2" />
          <input placeholder="Comentario" value={p.comentario} onChange={(e) => editarParo(i, "comentario", e.target.value)} className="border p-2 w-full mb-2" />

          <button onClick={() => eliminarParo(i)} className="bg-red-600 text-white w-full py-1">
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
