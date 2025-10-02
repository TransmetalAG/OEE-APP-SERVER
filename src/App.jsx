import React, { useState } from 'react'
import Captura from './components/Captura'
import Historial from './components/Historial'
import KPIs from './components/KPIs'
import Login from './components/Login'

export default function App() {
  const [tab, setTab] = useState('captura')
  const [auth, setAuth] = useState(false)

  return (
    <div className="max-w-5xl mx-auto p-4">
      <nav className="flex gap-4 mb-4">
        <button onClick={() => setTab('captura')} className="px-3 py-1 bg-blue-200 rounded">Captura</button>
        {auth && <button onClick={() => setTab('historial')} className="px-3 py-1 bg-blue-200 rounded">Historial</button>}
        {auth && <button onClick={() => setTab('kpis')} className="px-3 py-1 bg-blue-200 rounded">KPIs / OEE</button>}
        <button onClick={() => setTab('login')} className="px-3 py-1 bg-blue-200 rounded">{auth ? "Cerrar Sesión" : "Login"}</button>
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
