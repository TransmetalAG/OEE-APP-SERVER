import React, { useState } from 'react'

export default function Login({auth, setAuth}){
  const [pass, setPass] = useState("")

  const handleLogin = () => {
    if(auth){ setAuth(false); return }
    if(pass === "lid3re5"){ setAuth(true) }
    else alert("Contraseña incorrecta")
  }

  return (
    <div>
      <h2 className="font-bold mb-2">{auth ? "Cerrar sesión" : "Login Supervisor"}</h2>
      {!auth && <input type="password" value={pass} onChange={e=>setPass(e.target.value)} className="border mr-2"/>}
      <button onClick={handleLogin} className="bg-blue-500 text-white px-3 py-1 rounded">{auth ? "Cerrar" : "Ingresar"}</button>
    </div>
  )
}
