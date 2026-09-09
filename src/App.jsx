import React, { useState } from 'react'
import Captura from './components/Captura'
import Historial from './components/Historial'
import KPIs from './components/KPIs'
import Login from './components/Login'

export default function App() {
  const [tab, setTab] = useState('captura')
  const [auth, setAuth] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar responsive */}
      <nav className="bg-white shadow-md sticky top-0 z-10">
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 py-2">
            <button 
              onClick={() => setTab('captura')} 
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                tab === 'captura' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span className="hidden xs:inline">📝</span> Captura
            </button>
            
            {auth && (
              <button 
                onClick={() => setTab('historial')} 
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                  tab === 'historial' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="hidden xs:inline">📋</span> Historial
              </button>
            )}
            
            {auth && (
              <button 
                onClick={() => setTab('kpis')} 
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                  tab === 'kpis' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="hidden xs:inline">📊</span> KPIs
              </button>
            )}
            
            <button 
              onClick={() => {
                if (auth) {
                  setAuth(false)
                  setTab('login')
                } else {
                  setTab('login')
                }
              }} 
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ml-auto ${
                auth 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {auth ? (
                <>
                  <span className="hidden xs:inline">🚪</span> Salir
                </>
              ) : (
                <>
                  <span className="hidden xs:inline">🔑</span> Login
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido - sin límite de ancho */}
      <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
        {tab === 'captura' && <Captura />}
        {tab === 'historial' && auth && <Historial />}
        {tab === 'kpis' && auth && <KPIs />}
        {tab === 'login' && <Login auth={auth} setAuth={setAuth} />}
      </div>
    </div>
  )
}
