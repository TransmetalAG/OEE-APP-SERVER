import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const TABLA = "produccion_diaria";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const fechaLocal = () => {
  const hoy = new Date();

  return {
    anio: hoy.getFullYear(),
    mes: hoy.getMonth(),
  };
};

const fechaISO = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(
    2,
    "0"
  )}`;

const diasEnMes = (anio, mes) =>
  new Date(anio, mes + 1, 0).getDate();

const inputCls =
  "w-full min-w-[72px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100";

export default function Produccion() {
  const actual = fechaLocal();

  const [anio, setAnio] = useState(actual.anio);
  const [mes, setMes] = useState(actual.mes);

  const [datos, setDatos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const cantidadDias = useMemo(
    () => diasEnMes(anio, mes),
    [anio, mes]
  );

  const dias = useMemo(
    () => Array.from({ length: cantidadDias }, (_, i) => i + 1),
    [cantidadDias]
  );

  const mostrarToast = (mensaje, tipo = "success") => {
    setToast({ mensaje, tipo });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  /* ==========================
     CARGAR MES
  ========================== */
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);

      const inicio = fechaISO(anio, mes, 1);
      const fin = fechaISO(anio, mes, cantidadDias);

      const { data, error } = await supabase
        .from(TABLA)
        .select("*")
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: true });

      if (error) {
        console.error(error);
        mostrarToast("No se pudo cargar la producción", "error");
        setCargando(false);
        return;
      }

      const mapa = {};

      dias.forEach((dia) => {
        const fecha = fechaISO(anio, mes, dia);

        mapa[fecha] = {
          meta_carretas: "",
          real_carretas: "",
        };
      });

      (data || []).forEach((registro) => {
        mapa[registro.fecha] = {
          meta_carretas: registro.meta_carretas,
          real_carretas: registro.real_carretas,
        };
      });

      setDatos(mapa);
      setCargando(false);
    };

    cargar();
  }, [anio, mes, cantidadDias]);

  /* ==========================
     CAMBIAR VALORES
  ========================== */
  const cambiarValor = (fecha, campo, valor) => {
    if (valor !== "" && Number(valor) < 0) return;

    setDatos((actual) => ({
      ...actual,
      [fecha]: {
        ...actual[fecha],
        [campo]: valor,
      },
    }));
  };

  /* ==========================
     ACUMULADOS
  ========================== */
  const filas = useMemo(() => {
    let metaAcumulada = 0;
    let realAcumulado = 0;

    return dias.map((dia) => {
      const fecha = fechaISO(anio, mes, dia);

      const registro = datos[fecha] || {
        meta_carretas: "",
        real_carretas: "",
      };

      const meta =
        registro.meta_carretas === ""
          ? 0
          : Number(registro.meta_carretas);

      const real =
        registro.real_carretas === ""
          ? 0
          : Number(registro.real_carretas);

      metaAcumulada += meta;
      realAcumulado += real;

      return {
        dia,
        fecha,
        meta,
        real,
        metaValor: registro.meta_carretas,
        realValor: registro.real_carretas,
        metaAcumulada,
        realAcumulado,
      };
    });
  }, [datos, dias, anio, mes]);

  const totalMeta =
    filas.length > 0
      ? filas[filas.length - 1].metaAcumulada
      : 0;

  const totalReal =
    filas.length > 0
      ? filas[filas.length - 1].realAcumulado
      : 0;

  const brecha = totalReal - totalMeta;

  const cumplimiento =
    totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;

  /* ==========================
     GUARDAR MES
  ========================== */
  const guardar = async () => {
    setGuardando(true);

    const registros = filas.map((fila) => ({
      fecha: fila.fecha,
      meta_carretas: fila.meta,
      real_carretas: fila.real,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from(TABLA)
      .upsert(registros, {
        onConflict: "fecha",
      });

    setGuardando(false);

    if (error) {
      console.error(error);
      mostrarToast("No se pudo guardar la producción", "error");
      return;
    }

    mostrarToast("✓ Producción guardada correctamente");
  };

  /* ==========================
     NAVEGACIÓN MES
  ========================== */
  const mesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAnio((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  };

  const mesSiguiente = () => {
    if (mes === 11) {
      setMes(0);
      setAnio((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  /* ==========================
     UI
  ========================== */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Control mensual
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-800">
                Producción de Carretas
              </h2>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={mesAnterior}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
              >
                ←
              </button>

              <div className="min-w-[190px] text-center">
                <div className="text-base font-bold text-slate-800">
                  {MESES[mes]} {anio}
                </div>
              </div>

              <button
                onClick={mesSiguiente}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
              >
                →
              </button>
            </div>

          </div>
        </div>

        {/* RESUMEN */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Meta acumulada
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-800">
              {totalMeta}
            </p>

            <p className="text-xs text-slate-400">
              carretas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Real acumulado
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-800">
              {totalReal}
            </p>

            <p className="text-xs text-slate-400">
              carretas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Brecha
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                brecha >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {brecha > 0 ? "+" : ""}
              {brecha}
            </p>

            <p className="text-xs text-slate-400">
              carretas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Cumplimiento
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                cumplimiento >= 100
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {cumplimiento.toFixed(1)}%
            </p>

            <p className="text-xs text-slate-400">
              producción
            </p>
          </div>

        </div>

        {/* TABLA */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-800">
              Producción diaria
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Ingresa la meta y la producción real de cada día.
              Meta 0 = día no productivo.
            </p>
          </div>

          {cargando ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Cargando producción…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                    <th className="px-4 py-3 text-left">
                      Día
                    </th>

                    <th className="px-4 py-3 text-center">
                      Meta
                    </th>

                    <th className="px-4 py-3 text-center">
                      Real
                    </th>

                    <th className="px-4 py-3 text-center">
                      Meta acum.
                    </th>

                    <th className="px-4 py-3 text-center">
                      Real acum.
                    </th>

                    <th className="px-4 py-3 text-center">
                      Brecha
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {filas.map((fila) => {
                    const noProductivo = fila.meta === 0;

                    const diferencia =
                      fila.realAcumulado -
                      fila.metaAcumulada;

                    return (
                      <tr
                        key={fila.fecha}
                        className={`border-b border-slate-100 last:border-0 ${
                          noProductivo
                            ? "bg-slate-50"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-700">
                            {fila.dia}
                          </div>

                          {noProductivo && (
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              No productivo
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={fila.metaValor}
                            onChange={(e) =>
                              cambiarValor(
                                fila.fecha,
                                "meta_carretas",
                                e.target.value
                              )
                            }
                            className={inputCls}
                          />
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={fila.realValor}
                            onChange={(e) =>
                              cambiarValor(
                                fila.fecha,
                                "real_carretas",
                                e.target.value
                              )
                            }
                            className={inputCls}
                          />
                        </td>

                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          {fila.metaAcumulada}
                        </td>

                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          {fila.realAcumulado}
                        </td>

                        <td
                          className={`px-4 py-3 text-center font-bold ${
                            diferencia >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {diferencia > 0 ? "+" : ""}
                          {diferencia}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}

        </div>

        {/* GUARDAR */}
        <div className="sticky bottom-4 mt-4">
          <button
            onClick={guardar}
            disabled={guardando || cargando}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? "Guardando…"
              : `Guardar ${MESES[mes]}`}
          </button>
        </div>

      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg ${
            toast.tipo === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.mensaje}
        </div>
      )}

    </div>
  );
}
