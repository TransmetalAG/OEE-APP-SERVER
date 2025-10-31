<tbody>
  {registrosFiltrados.map((r, i) => {
    const oee = calcularOEE(r);
    if (!oee) return null;
    return (
      <tr key={i} className="text-center">
        <td className="border p-2">{oee.fecha}</td>
        <td className="border p-2">{oee.maquina}</td>
        <td className="border p-2">{oee.proceso}</td>
        <td className="border p-2">{oee.tiempoProgramado.toFixed(1)}</td>
        <td className="border p-2">{oee.parosPlaneados}</td>
        <td className="border p-2">{oee.parosNoPlaneados}</td>
        <td className="border p-2">{oee.piezasBuenas}</td>
        <td className="border p-2">{oee.piezasMalas}</td>
        <td className="border p-2">{oee.tiempoOperativo.toFixed(1)}</td>
        <td className="border p-2">{oee.perdidaRitmo.toFixed(1)}</td>
        <td className="border p-2">{oee.tiempoOperativoNeto.toFixed(1)}</td>
        <td className="border p-2">{oee.perdidasCalidad.toFixed(1)}</td>
        <td className="border p-2">{oee.tiempoUtil.toFixed(1)}</td>
        <td className="border p-2">
          {(oee.disponibilidad * 100).toFixed(1)}%
        </td>
        <td className="border p-2">
          {(oee.desempeno * 100).toFixed(1)}%
        </td>
        <td className="border p-2">
          {(oee.calidad * 100).toFixed(1)}%
        </td>
        <td className="border p-2 font-bold">
          {(oee.oee * 100).toFixed(1)}%
        </td>
      </tr>
    );
  })}

  {/* 🔹 Fila TOTAL */}
  {(() => {
    const acumulados = registrosFiltrados
      .map((r) => calcularOEE(r))
      .filter(Boolean)
      .reduce(
        (acc, oee) => ({
          tiempoProgramado: acc.tiempoProgramado + oee.tiempoProgramado,
          parosPlaneados: acc.parosPlaneados + oee.parosPlaneados,
          parosNoPlaneados: acc.parosNoPlaneados + oee.parosNoPlaneados,
          tiempoOperativo: acc.tiempoOperativo + oee.tiempoOperativo,
          perdidaRitmo: acc.perdidaRitmo + oee.perdidaRitmo,
          tiempoOperativoNeto: acc.tiempoOperativoNeto + oee.tiempoOperativoNeto,
          perdidasCalidad: acc.perdidasCalidad + oee.perdidasCalidad,
          tiempoUtil: acc.tiempoUtil + oee.tiempoUtil,
        }),
        {
          tiempoProgramado: 0,
          parosPlaneados: 0,
          parosNoPlaneados: 0,
          tiempoOperativo: 0,
          perdidaRitmo: 0,
          tiempoOperativoNeto: 0,
          perdidasCalidad: 0,
          tiempoUtil: 0,
        }
      );

    return (
      <tr className="font-bold bg-gray-200 sticky bottom-0">
        <td className="border p-2 text-center" colSpan={3}>
          TOTAL
        </td>
        <td className="border p-2">{acumulados.tiempoProgramado.toFixed(1)}</td>
        <td className="border p-2">{acumulados.parosPlaneados.toFixed(1)}</td>
        <td className="border p-2">{acumulados.parosNoPlaneados.toFixed(1)}</td>
        <td className="border p-2" colSpan={2}></td>
        <td className="border p-2">{acumulados.tiempoOperativo.toFixed(1)}</td>
        <td className="border p-2">{acumulados.perdidaRitmo.toFixed(1)}</td>
        <td className="border p-2">{acumulados.tiempoOperativoNeto.toFixed(1)}</td>
        <td className="border p-2">{acumulados.perdidasCalidad.toFixed(1)}</td>
        <td className="border p-2">{acumulados.tiempoUtil.toFixed(1)}</td>
        <td colSpan={4} className="border p-2 text-center text-gray-600">
          ⬆️ Suma de tiempos globales usados para OEE
        </td>
      </tr>
    );
  })()}
</tbody>
