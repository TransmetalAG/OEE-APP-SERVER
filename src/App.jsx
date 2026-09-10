import React, { useState } from 'react'
import Captura from './components/Captura'
import Historial from './components/Historial'
import KPIs from './components/KPIs'
import Login from './components/Login'

export default function App() {
  const [tab, setTab] = useState('captura')
  const [auth, setAuth] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header mejorado */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <span className="text-white text-2xl">🏭</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Control de Producción</h1>
                <p className="text-sm text-gray-500">Sistema de gestión de paros y eficiencia</p>
              </div>
            </div>
            <button
              onClick={() => setTab('login')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                auth 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md'
              }`}
            >
              {auth ? 'Cerrar Sesión' : 'Iniciar Sesión'}
            </button>
          </div>
        </header>

        {/* Navegación mejorada */}
        <nav className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setTab('captura')}
            className={`px-5 py-2.5 rounded-lg transition-all duration-200 ${
              tab === 'captura'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200'
            }`}
          >
            Tiempos
          </button>
          {auth && (
            <button
              onClick={() => setTab('historial')}
              className={`px-5 py-2.5 rounded-lg transition-all duration-200 ${
                tab === 'historial'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200'
              }`}
            >
              Paros
            </button>
          )}
          {auth && (
            <button
              onClick={() => setTab('kpis')}
              className={`px-5 py-2.5 rounded-lg transition-all duration-200 ${
                tab === 'kpis'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200'
              }`}
            >
              Eficiencia
            </button>
          )}
        </nav>

        {/* Contenido principal */}
        <main className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/50 p-6">
          {tab === 'captura' && <Captura />}
          {tab === 'historial' && auth && <Historial />}
          {tab === 'kpis' && auth && <KPIs />}
          {tab === 'login' && <Login auth={auth} setAuth={setAuth} />}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
          <p>© 2026 Sistema de Control de Producción</p>
        </footer>
      </div>
    </div>
  )
}
