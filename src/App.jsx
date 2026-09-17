import React, { useState } from "react";
import Captura from "./components/Captura";
import Produccion from "./components/Produccion";
import Historial from "./components/Historial";
import KPIs from "./components/KPIs";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

/* =======================
   PALETA GRUPO AG (azul)
   — cambia estos hex si tienes la guía de marca exacta —
======================= */
const AG = {
  navy900: "#0A2A43", // fondo header / nav
  blue700: "#14476E", // estado activo, botones primarios
  blue500: "#1E6FA8", // acento / indicador activo
  blue100: "#EAF3FA", // fondo tenue de tarjetas/tags
  ink900: "#1C1F26", // texto principal
  ink500: "#64748B", // texto secundario
  alert600: "#C4453A", // solo para alertas de paro/error
};

/* =======================
   ÍCONOS (SVG inline, sin dependencias)
======================= */
const IconTiempos = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" strokeLinecap="round" />
  </svg>
);
const IconProduccion = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
  </svg>
);
const IconParos = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M10.3 3.5 3.5 10.3v3.4l6.8 6.8h3.4l6.8-6.8v-3.4L13.7 3.5z" strokeLinejoin="round" />
    <path d="M12 8v5" strokeLinecap="round" />
    <circle cx="12" cy="16.2" r="0.6" fill="currentColor" />
  </svg>
);
const IconEficiencia = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M4 15a8 8 0 0 1 16 0" strokeLinecap="round" />
    <path d="M12 15 15.5 10" strokeLinecap="round" />
  </svg>
);
const IconDashboard = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.2" />
    <rect x="13" y="4" width="7" height="7" rx="1.2" />
    <rect x="4" y="13" width="7" height="7" rx="1.2" />
    <rect x="13" y="13" width="7" height="7" rx="1.2" />
  </svg>
);
const IconUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <circle cx="12" cy="8.5" r="3.2" />
    <path d="M5 20c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2" strokeLinecap="round" />
  </svg>
);

const TABS = [
  { id: "captura", label: "Tiempos", icon: IconTiempos, requiresAuth: false },
  { id: "produccion", label: "Producción", icon: IconProduccion, requiresAuth: true },
  { id: "historial", label: "Paros", icon: IconParos, requiresAuth: true },
  { id: "kpis", label: "Eficiencia", icon: IconEficiencia, requiresAuth: true },
  { id: "dashboard", label: "Dashboard", icon: IconDashboard, requiresAuth: true },
];

export default function App() {
  const [tab, setTab] = useState("captura");
  const [auth, setAuth] = useState(false);

  const visibleTabs = TABS.filter((t) => !t.requiresAuth || auth);

  // Antes: siempre navegaba a "login" sin importar el estado.
  // Ahora: si ya está autenticado, cierra sesión directo; si no, va al login.
  const handleAuthButton = () => {
    if (auth) {
      setAuth(false);
      setTab("captura");
    } else {
      setTab("login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ color: AG.ink900 }}>
      {/* HEADER — compacto, una sola línea */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 shadow-sm"
        style={{ backgroundColor: AG.navy900 }}
      >
        <div className="flex items-center gap-2.5">
          {/* Marca simple: iniciales en bloque, no emoji */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: AG.blue500 }}
          >
            AG
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Control de Producción</p>
            <p className="text-[11px] text-white/60">Paros y eficiencia</p>
          </div>
        </div>

        <button
          onClick={handleAuthButton}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors"
          style={{ backgroundColor: auth ? AG.alert600 : AG.blue700 }}
        >
          <IconUser className="h-4 w-4" />
          {auth ? "Salir" : "Ingresar"}
        </button>
      </header>

      {/* CONTENIDO — padding inferior para no quedar detrás del nav fijo */}
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {tab === "captura" && <Captura />}
          {tab === "produccion" && auth && <Produccion />}
          {tab === "historial" && auth && <Historial />}
          {tab === "kpis" && auth && <KPIs />}
          {tab === "dashboard" && auth && <Dashboard />}
          {tab === "login" && <Login auth={auth} setAuth={setAuth} />}
        </div>
      </main>

      {/* NAV INFERIOR FIJA — patrón de app nativa, con safe-area para iPhones */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t"
        style={{
          backgroundColor: "white",
          borderColor: "#E2E8F0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors"
              style={{ color: active ? AG.blue700 : AG.ink500 }}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: active ? AG.blue500 : AG.ink500 }}
              />
              {label}
              {active && (
                <span
                  className="mt-0.5 h-0.5 w-5 rounded-full"
                  style={{ backgroundColor: AG.blue500 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
