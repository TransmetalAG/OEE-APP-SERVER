import React, { useState } from 'react'
import Captura from './components/Captura'
import Historial from './components/Historial'
import KPIs from './components/KPIs'
import Login from './components/Login'
import { 
  HomeIcon, 
  ClockIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'

export default function App() {
  const [tab, setTab] = useState('captura')
  const [auth, setAuth] = useState(false)

  const tabs = [
    { id: 'captura', label: 'Captura', icon: HomeIcon, visible: true },
    { id: 'historial', label: 'Historial', icon: ClockIcon, visible: auth },
    { id: 'kpis', label: 'KPIs / OEE', icon: ChartBarIcon, visible: auth },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header mejorado */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">📊 Control de Producción</h1>
                <p className="text-sm text-gray-500">Sistema de gestión de paros y eficiencia</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {auth && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  👋 Usuario activo
                </span>
              )}
              <button
                onClick={() => setTab('login')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  auth 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {auth ? (
                  <>
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </>
                ) : (
                  <>
                    <UserCircleIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Iniciar Sesión</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Navegación mejorada */}
        <nav className="flex flex-wrap gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon, visible }) => 
            visible && (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 ${
                  tab === id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md border border-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </button>
            )
          )}
        </nav>

        {/* Contenido principal con diseño mejorado */}
        <main className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-white/50 p-6 transition-all duration-300">
          {tab === 'captura' && <Captura />}
          {tab === 'historial' && auth && <Historial />}
          {tab === 'kpis' && auth && <KPIs />}
          {tab === 'login' && <Login auth={auth} setAuth={setAuth} />}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
          <p>© 2026 Sistema de Control de Producción • Todos los derechos reservados</p>
        </footer>
      </div>
    </div>
  )
}
