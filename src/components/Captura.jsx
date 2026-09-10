import React, { useEffect, useMemo, useState } from "react";
import { catalogo } from "../data/catalogo";
import { operadores } from "../data/operadores";
import { catalogoParos } from "../data/catalogoParos";
import { supabase } from "../supabaseClient";

/* =======================
   CONSTANTES
======================= */
const STORAGE_KEY = "capturasPendientes";
const TABLA = "registros";

const TIPOS_PARO = {
  PLANEADO: "Planeado",
  NO_PLANEADO: "No Planeado",
  ANOMALIA: "Anomalía",
};

const ORIGENES_PARO = ["Mecánica", "Eléctrica", "Operacional"];

const PARO_VACIO = {
  tipo: "",
  origen: "",
  hecho: "",
  causa: "",
  accion: "",
  minutos: "",
  comentario: "",
};

const FORM_INICIAL = () => ({
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

/* =======================
   HELPERS
======================= */
const inputCls = (err) =>
  `w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-2 ${
    err
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"
  }`;

const badgeTone = (tipo) => {
  switch (tipo) {
    case TIPOS_PARO.PLANEADO:
      return "bg-slate-100 text-slate-700 border-slate-200";
    case TIPOS_PARO.NO_PLANEADO:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case TIPOS_PARO.ANOMALIA:
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
};

/* =======================
   SUBCOMPONENTES UI
======================= */
function Section({ title, action, children }) {
  return (
    <section className="py-6 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, error, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-500 mb-1 tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const tones = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-sm shadow-lg border ${
        tones[toast.tipo] || tones.success
      }`}
    >
      {toast.msg}
    </div>
  );
}

function ParoForm({ paro, maquina, index, onChange, onRemove, error }) {
  const opcionesParo = (catalogoParos[maquina] || []).filter(
    (x) => x.causa === paro.origen
  );

  return (
    <div
      className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm ${
        error ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Paro #{index + 1}
          </span>
          {paro.tipo && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(
                paro.tipo
              )}`}
            >
              {paro.tipo}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-600 text-sm transition-colors"
        >
          ✕ Eliminar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            value={paro.tipo}
            onChange={(e) => onChange("tipo", e.target.value)}
            className={inputCls()}
          >
            <option value="">Selecciona...</option>
            <option value={TIPOS_PARO.PLANEADO}>Planeado</option>
            <option value={TIPOS_PARO.NO_PLANEADO}>No Planeado</option>
            <option value={TIPOS_PARO.ANOMALIA}>Anomalía</option>
          </select>
        </Field>

        {paro.tipo === TIPOS_PARO.NO_PLANEADO && (
          <>
            <Field label="Origen">
              <select
                value={paro.origen}
                onChange={(e) => onChange("origen", e.target.value)}
                className={inputCls()}
              >
                <option value="">Selecciona...</option>
                {ORIGENES_PARO.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>

            {paro.origen && (
              <Field label="Paro específico" full>
                <select
                  value={paro.hecho}
                  onChange={(e) => onChange("hecho", e.target.value)}
                  className={inputCls()}
                >
                  <option value="">Selecciona paro...</option>
                  {opcionesParo.map((x, i) => (
                    <option key={i} value={x.paro}>
                      {x.paro}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}

        {paro.tipo === TIPOS_PARO.ANOMALIA && (
          <Field label="Hecho" full>
            <input
              value={paro.hecho}
              onChange={(e) => onChange("hecho", e.target.value)}
              placeholder="Describe el hecho"
              className={inputCls()}
            />
          </Field>
        )}

        {(paro.tipo === TIPOS_PARO.NO_PLANEADO ||
          paro.tipo === TIPOS_PARO.ANOMALIA) && (
          <>
            <Field label="Causa">
              <input
                value={paro.causa}
                onChange={(e) => onChange("causa", e.target.value)}
                placeholder="Causa raíz"
                className={inputCls()}
              />
            </Field>
            <Field label="Acción">
              <input
                value={paro.accion}
                onChange={(e) => onChange("accion", e.target.value)}
                placeholder="Acción tomada"
                className={inputCls()}
              />
            </Field>
          </>
        )}

        <Field label="Minutos">
          <input
            type="number"
            min="1"
            value={paro.minutos}
            onChange={(e) => onChange("minutos", e.target.value)}
            placeholder="0"
            className={inputCls()}
          />
        </Field>

        <Field label="Comentario">
          <input
            value={paro.comentario}
            onChange={(e) => onChange("comentario", e.target.value)}
            placeholder="Observaciones"
            className={inputCls()}
          />
        </Field>
      </div>

      {error && <p className="text-xs text-rose-600 mt-3">⚠ {error}</p>}
    </div>
  );
}

/* =======================
   VALIDACIÓN
======================= */
function validarRegistro(form) {
  const e = {};

  if (!form.fecha) e.fecha = "Requerido";
  if (!form.codigo) e.codigo = "Requerido";
  if (form.codigo && !form.nombre) e.codigo = "Código no válido";
  if (!form.maquina) e.maquina = "Requerido";
  if (!form.proceso) e.proceso = "Requerido";
  if (!form.inicio) e.inicio = "Requerido";
  if (!form.fin) e.fin = "Requerido";
  if (!form.carretas) e.carretas = "Requerido";
  if (!form.piezastotales) e.piezastotales = "Requerido";
  if (!form.piezasbuenas) e.piezasbuenas = "Requerido";

  if (form.inicio && form.fin && form.inicio >= form.fin) {
    e.fin = "Debe ser posterior al inicio";
  }

  if (
    form.piezastotales !== "" &&
    form.piezasbuenas !== "" &&
    Number(form.piezasbuenas) > Number(form.piezastotales)
  ) {
    e.piezasbuenas = "No puede superar el total";
  }

  form.paros.forEach((p, i) => {
    const pref = `paro_${i}`;
    if (!p.tipo) return (e[pref] = "Selecciona tipo");
    if (!p.minutos || Number(p.minutos) <= 0)
      return (e[pref] = "Minutos inválidos");
    if (!p.comentario) return (e[pref] = "Comentario requerido");

    if (p.tipo === TIPOS_PARO.NO_PLANEADO) {
      if (!p.origen) return (e[pref] = "Origen requerido");
      if (!p.hecho) return (e[pref] = "Paro específico requerido");
      if (!p.causa) return (e[pref] = "Causa requerida");
      if (!p.accion) return (e[pref] = "Acción requerida");
    }

    if (p.tipo === TIPOS_PARO.ANOMALIA) {
      if (!p.hecho) return (e[pref] = "Hecho requerido");
      if (!p.causa) return (e[pref] = "Causa requerida");
      if (!p.accion) return (e[pref] = "Acción requerida");
    }
  });

  return e;
}

/* =======================
   COMPONENTE PRINCIPAL
======================= */
export default function Captura() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientes, setPendientes] = useState([]);
  const [toast, setToast] = useState(null);

  /* ---------- Pendientes: cargar + escuchar entre pestañas ---------- */
  useEffect(() => {
    const leer = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setPendientes(raw ? JSON.parse(raw) : []);
      } catch {
        setPendientes([]);
      }
    };
    leer();
    window.addEventListener("storage", leer);
    return () => window.removeEventListener("storage", leer);
  }, []);

  /* ---------- Listas derivadas ---------- */
  const maquinas = useMemo(
    () => [...new Set(catalogo.map((m) => m.maquina))],
    []
  );

  const procesosDeMaquina = useMemo(
    () => catalogo.filter((m) => m.maquina === form.maquina),
    [form.maquina]
  );

  /* ---------- Toast ---------- */
  const mostrarToast = (msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  /* ---------- Handlers generales ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrores((er) => ({ ...er, [name]: undefined }));
  };

  const handleCodigo = (e) => {
    const codigo = e.target.value.trim();
    const op = operadores.find((o) => String(o.codigo) === codigo);
    setForm((f) => ({ ...f, codigo, nombre: op ? op.nombre : "" }));
    setErrores((er) => ({ ...er, codigo: undefined }));
  };

  const handleMaquina = (e) => {
    const maquina = e.target.value;
    setForm((f) => ({ ...f, maquina, proceso: "", paros: [] }));
    setErrores((er) => ({ ...er, maquina: undefined, proceso: undefined }));
  };

  /* ---------- Paros ---------- */
  const agregarParo = () =>
    setForm((f) => ({ ...f, paros: [...f.paros, { ...PARO_VACIO }] }));

  const editarParo = (i, campo, valor) => {
    setForm((f) => {
      const paros = [...f.paros];
      if (campo === "tipo") {
        paros[i] = { ...PARO_VACIO, tipo: valor };
      } else if (campo === "origen") {
        paros[i] = { ...PARO_VACIO, tipo: paros[i].tipo, origen: valor };
      } else {
        paros[i] = { ...paros[i], [campo]: valor };
      }
      return { ...f, paros };
    });

    setErrores((er) => {
      const copia = { ...er };
      delete copia[`paro_${i}`];
      return copia;
    });
  };

  const eliminarParo = (i) =>
    setForm((f) => ({
      ...f,
      paros: f.paros.filter((_, idx) => idx !== i),
    }));

  /* ---------- Guardar ---------- */
  const guardar = async () => {
    const errs = validarRegistro(form);
    if (Object.keys(errs).length) {
      setErrores(errs);
      mostrarToast("Revisa los campos marcados en rojo", "error");
      return;
    }

    setEnviando(true);

    const registro = {
      ...form,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros.map((p) => ({ ...p, minutos: Number(p.minutos) })),
      _id: crypto.randomUUID(),
    };

    try {
      const { _id, ...payload } = registro;
      const { error } = await supabase.from(TABLA).insert([payload]);
      if (error) throw error;

      mostrarToast("✓ Registro guardado correctamente", "success");
    } catch (err) {
      console.error("Error guardando en Supabase:", err);
      const cola = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      cola.push(registro);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cola));
      setPendientes(cola);
      mostrarToast(
        "📦 Guardado localmente, se sincronizará cuando haya conexión",
        "warning"
      );
    } finally {
      setEnviando(false);
      setForm(FORM_INICIAL());
      setErrores({});
    }
  };

  /* ---------- Sincronizar pendientes ---------- */
  const sincronizarPendientes = async () => {
    if (!pendientes.length) return;

    setSincronizando(true);
    const restantes = [];
    let ok = 0;

    for (const reg of pendientes) {
      const { _id, ...payload } = reg;
      const { error } = await supabase.from(TABLA).insert([payload]);
      if (error) restantes.push(reg);
      else ok++;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(restantes));
    setPendientes(restantes);
    setSincronizando(false);

    if (ok > 0) mostrarToast(`✓ ${ok} registro(s) sincronizado(s)`, "success");
    else mostrarToast("No se pudo sincronizar ningún registro", "error");
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-6 px-4">
      <div className="w-full max-w-3xl">
        {/* HEADER STICKY */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pb-3 bg-slate-50/80 backdrop-blur">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-semibold text-slate-800 tracking-tight">
                Registro de Producción
              </h2>
            </div>

            {pendientes.length > 0 && (
              <button
                onClick={sincronizarPendientes}
                disabled={sincronizando}
                className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition disabled:opacity-60"
              >
                {sincronizando
                  ? "Sincronizando…"
                  : `${pendientes.length} pendiente(s) · Sincronizar`}
              </button>
            )}
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* === DATOS GENERALES === */}
          <Section title="Datos generales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Fecha" error={errores.fecha}>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className={inputCls(errores.fecha)}
                />
              </Field>

              <Field label="Código operador" error={errores.codigo}>
                <input
                  value={form.codigo}
                  onChange={handleCodigo}
                  placeholder="Ej. 1024"
                  className={inputCls(errores.codigo)}
                />
              </Field>

              <Field label="Nombre" full>
                <input
                  value={form.nombre}
                  readOnly
                  placeholder="Se completa automáticamente al escribir el código"
                  className={`${inputCls()} bg-slate-100 text-slate-600 cursor-not-allowed`}
                />
              </Field>

              <Field label="Máquina" error={errores.maquina}>
                <select
                  value={form.maquina}
                  onChange={handleMaquina}
                  className={inputCls(errores.maquina)}
                >
                  <option value="">Selecciona...</option>
                  {maquinas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Proceso" error={errores.proceso}>
                <select
                  name="proceso"
                  value={form.proceso}
                  onChange={handleChange}
                  disabled={!form.maquina}
                  className={`${inputCls(errores.proceso)} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Selecciona...</option>
                  {procesosDeMaquina.map((m) => (
                    <option key={m.proceso} value={m.proceso}>
                      {m.proceso}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Hora inicio" error={errores.inicio}>
                <input
                  type="time"
                  name="inicio"
                  value={form.inicio}
                  onChange={handleChange}
                  className={inputCls(errores.inicio)}
                />
              </Field>

              <Field label="Hora fin" error={errores.fin}>
                <input
                  type="time"
                  name="fin"
                  value={form.fin}
                  onChange={handleChange}
                  className={inputCls(errores.fin)}
                />
              </Field>
            </div>
          </Section>

          {/* === PRODUCCIÓN === */}
          <Section title="Producción">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Carretas" error={errores.carretas}>
                <input
                  type="number"
                  min="0"
                  name="carretas"
                  value={form.carretas}
                  onChange={handleChange}
                  placeholder="0"
                  className={inputCls(errores.carretas)}
                />
              </Field>

              <Field label="Piezas totales" error={errores.piezastotales}>
                <input
                  type="number"
                  min="0"
                  name="piezastotales"
                  value={form.piezastotales}
                  onChange={handleChange}
                  placeholder="0"
                  className={inputCls(errores.piezastotales)}
                />
              </Field>

              <Field label="Piezas buenas" error={errores.piezasbuenas}>
                <input
                  type="number"
                  min="0"
                  name="piezasbuenas"
                  value={form.piezasbuenas}
                  onChange={handleChange}
                  placeholder="0"
                  className={inputCls(errores.piezasbuenas)}
                />
              </Field>
            </div>
          </Section>

          {/* === PAROS === */}
          <Section
            title="Paros (HCA)"
            action={
              <button
                type="button"
                onClick={agregarParo}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
              >
                + Añadir paro
              </button>
            }
          >
            {form.paros.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">
                Sin paros registrados
              </p>
            ) : (
              <div className="space-y-3">
                {form.paros.map((p, i) => (
                  <ParoForm
                    key={i}
                    index={i}
                    paro={p}
                    maquina={form.maquina}
                    error={errores[`paro_${i}`]}
                    onChange={(campo, valor) => editarParo(i, campo, valor)}
                    onRemove={() => eliminarParo(i)}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* BOTÓN GUARDAR STICKY */}
        <div className="sticky bottom-4 mt-4">
          <button
            onClick={guardar}
            disabled={enviando}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enviando ? "Guardando…" : "Guardar registro"}
          </button>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
