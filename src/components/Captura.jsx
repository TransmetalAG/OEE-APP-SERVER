import React, { useState, useEffect } from "react";
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
    piezastotales: "",
    piezasbuenas: "",
    paros: [],
    comentario_hora: "",
    comentario_calidad: "",
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

  const agregarParo = () => {
    setForm({
      ...form,
      paros: [...form.paros, { tipo: "", minutos: "", descripcion: "" }],
    });
  };

  const editarParo = (index, field, value) => {
    const nuevosParos = form.paros.map((paro, i) =>
      i === index ? { ...paro, [field]: value } : paro
    );
    setForm({ ...form, paros: nuevosParos });
  };

  const eliminarParo = (i) => {
    setForm({ ...form, paros: form.paros.filter((_, idx) => idx !== i) });
  };

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
      alert("⚠️ Debes completar todos los campos antes de guardar.");
      return;
    }

    for (let paro of form.paros) {
      if (!paro.tipo || !paro.minutos || !paro.descripcion) {
        alert("⚠️ Completa todos los campos de cada paro o elimínalos.");
        return;
      }
    }

    const registro = {
      fecha: form.fecha,
      codigo: form.codigo,
      nombre: form.nombre,
      maquina: form.maquina,
      proceso: form.proceso,
      inicio: form.inicio,
      fin: form.fin,
      carretas: Number(form.carretas),
      piezastotales: Number(form.piezastotales),
      piezasbuenas: Number(form.piezasbuenas),
      paros: form.paros,
      comentario_hora: form.comentario_hora,
      comentario_calidad: form.comentario_calidad,
    };

    try {
      const { error } = await supabase.from("registros").insert([registro]);
      if (error) throw error;
      alert("✅ Registro guardado en Supabase");
    } catch (err) {
      console.warn("Sin conexión. Guardando localmente...", err);
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
      paros: [],
      comentario_hora: "",
      comentario_calidad: "",
    });
  };

  const sincronizarPendientes = async () => {
    const guardados =
      JSON.parse(localStorage.getItem("capturasPendientes")) || [];
    if (guardados.length === 0) {
      alert("No hay registros pendientes por sincronizar.");
      return;
    }

    let sincronizados = 0;

    for (const registro of guardados) {
      try {
        const { error } = await supabase.from("registros").insert([registro]);
        if (!error) sincronizados++;
      } catch (err) {
        console.warn("Error al sincronizar:", err);
      }
    }

    if (sincronizados > 0) {
      localStorage.removeItem("capturasPendientes");
      setPendientes([]);
      alert(`✅ Se sincronizaron ${sincronizados} registros con Supabase.`);
    } else {
      alert("⚠️ No se pudo sincronizar. Verifica la conexión.");
    }
  };

  return (
    <div className="p-4 bg-white shadow">
      <h2 className="text-xl
