import React, { useState } from 'react'
import Captura from './components/Captura'
import Historial from './components/Historial'
import KPIs from './components/KPIs'
import Login from './components/Login'

export default function App() {
  const [tab, setTab] = useState('captura')
  const [auth, setAuth] = useState(false)

  return (
    // QUITA el max-w-5xl para que ocupe todo el ancho
    <div className="p-4">
      <nav className="flex gap-4 mb-4 flex-wrap">
        <button 
          onClick={() => setTab('captura')} 
          className={`px-3 py-1 rounded ${
            tab === 'captura' ? 'bg-blue-600 text-white' : 'bg-blue-200'
          }`}
        >
          Captura
        </button>
        {auth && (
          <button 
            onClick={() => setTab('historial')} 
            className={`px-3 py-1 rounded ${
              tab === 'historial' ? 'bg-blue-600 text-white' : 'bg-blue-200'
            }`}
          >
            Historial
          </button>
        )}
        {auth && (
          <button 
            onClick={() => setTab('kpis')} 
            className={`px-3 py-1 rounded ${
              tab === 'kpis' ? 'bg-blue-600 text-white' : 'bg-blue-200'
            }`}
          >
            KPIs / OEE
          </button>
        )}
        <button 
          onClick={() => setTab('login')} 
          className={`px-3 py-1 rounded ml-auto ${
            auth ? 'bg-red-500 text-white' : 'bg-blue-200'
          }`}
        >
          {auth ? "Cerrar Sesión" : "Login"}
        </button>
      </nav>
      <div className="bg-white p-4 rounded shadow">
        {tab === 'captura' && <Captura />}
        {tab === 'historial' && auth && <Historial />}
        {tab === 'kpis' && auth && <KPIs />}
        {tab === 'login' && <Login auth={auth} setAuth={setAuth} />}
      </div>
    </div>
  )
}
