// ... (mantén todas las importaciones igual)

export default function Historial() {
  // ... (todos los useState y funciones igual)

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">📋 Historial de Paros</h2>

      {/* Filtros - Responsive */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4">
        {/* Fechas */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <label className="text-xs sm:text-sm font-medium">Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border p-1.5 sm:p-2 rounded text-xs sm:text-sm flex-1 min-w-[120px]"
          />
          <label className="text-xs sm:text-sm font-medium">Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border p-1.5 sm:p-2 rounded text-xs sm:text-sm flex-1 min-w-[120px]"
          />
        </div>

        {/* Selectores */}
        <select
          value={maquinaFiltro}
          onChange={(e) => setMaquinaFiltro(e.target.value)}
          className="border p-1.5 sm:p-2 rounded text-xs sm:text-sm flex-1 sm:flex-none min-w-[120px]"
        >
          <option value="">Todas las máquinas</option>
          {maquinasUnicas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border p-1.5 sm:p-2 rounded text-xs sm:text-sm flex-1 sm:flex-none min-w-[120px]"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PARO.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>

        {/* Botones - En móvil se apilan */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs sm:text-sm"
            disabled={loading}
          >
            {loading ? "⏳" : "🔄"} <span className="hidden xs:inline">Refrescar</span>
          </button>

          <button
            onClick={limpiarFiltros}
            className="flex-1 sm:flex-none bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-xs sm:text-sm"
          >
            🗑️ <span className="hidden xs:inline">Limpiar</span>
          </button>

          <button
            onClick={exportarExcel}
            className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-xs sm:text-sm"
            disabled={parosFiltrados.length === 0}
          >
            📤 <span className="hidden xs:inline">Exportar</span>
          </button>

          <button
            onClick={() => setMostrarPareto(!mostrarPareto)}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs sm:text-sm ${
              mostrarPareto 
                ? "bg-purple-600 text-white hover:bg-purple-700" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            📊 <span className="hidden xs:inline">Pareto</span>
          </button>
        </div>
      </div>

      {/* Info de registros */}
      <div className="mb-3 text-xs sm:text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 bg-gray-50 p-2 sm:p-3 rounded">
        <span>
          Mostrando <span className="font-bold text-blue-600">{parosFiltrados.length}</span> de <span className="font-bold">{paros.length}</span> registros
        </span>
        {(fechaInicio || fechaFin) && (
          <span className="text-blue-600 text-xs sm:text-sm">
            📅 {fechaInicio || "Inicio"} → {fechaFin || "Fin"}
          </span>
        )}
      </div>

      {/* Gráfica de Pareto - Ajustada para móvil */}
      {mostrarPareto && datosPareto.length > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-base sm:text-lg font-bold mb-2">📊 Análisis de Pareto</h3>
          
          {/* Estadísticas - Grid responsive */}
          {estadisticasPareto && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
              <div className="bg-white p-2 sm:p-3 rounded shadow text-center">
                <div className="text-[10px] sm:text-xs text-gray-600">Total minutos</div>
                <div className="text-base sm:text-xl font-bold text-blue-600">
                  {estadisticasPareto.totalMinutos}
                </div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded shadow text-center">
                <div className="text-[10px] sm:text-xs text-gray-600">Causas totales</div>
                <div className="text-base sm:text-xl font-bold">
                  {estadisticasPareto.totalCausas}
                </div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded shadow text-center">
                <div className="text-[10px] sm:text-xs text-gray-600">Causas que generan 80%</div>
                <div className="text-base sm:text-xl font-bold text-green-600">
                  {estadisticasPareto.causas80}
                </div>
              </div>
              <div className="bg-white p-2 sm:p-3 rounded shadow text-center">
                <div className="text-[10px] sm:text-xs text-gray-600">% representado</div>
                <div className="text-base sm:text-xl font-bold text-purple-600">
                  {estadisticasPareto.porcentaje80}%
                </div>
              </div>
            </div>
          )}

          {/* Gráfica - Altura ajustable */}
          <div className="w-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart 
                data={datosPareto}
                margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="causa" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  interval={0}
                  tick={{ fontSize: 9 }}
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 9 }}
                  width={40}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  width={35}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'porcentajeAcumulado') return `${value}%`;
                    return value;
                  }}
                  contentStyle={{ fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="minutos" name="Minutos">
                  {datosPareto.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.esPareto ? '#4CAF50' : '#F44336'}
                    />
                  ))}
                </Bar>
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="porcentajeAcumulado" 
                  stroke="#FF7300" 
                  name="% Acumulado"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda - En móvil se apila */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
              <span className="text-[10px] sm:text-sm">80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
              <span className="text-[10px] sm:text-sm">20%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 sm:w-8 bg-orange-500"></div>
              <span className="text-[10px] sm:text-sm">Línea 80%</span>
            </div>
          </div>

          {/* Tabla de causas - Scroll horizontal en móvil */}
          <div className="mt-3 overflow-x-auto max-h-60 overflow-y-auto border rounded">
            <table className="w-full text-[10px] sm:text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-1 sm:p-2 text-left">#</th>
                  <th className="border p-1 sm:p-2 text-left">Causa</th>
                  <th className="border p-1 sm:p-2 text-right">Min</th>
                  <th className="border p-1 sm:p-2 text-right">%</th>
                  <th className="border p-1 sm:p-2 text-right">% Acum</th>
                  <th className="border p-1 sm:p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datosPareto.map((item, index) => (
                  <tr key={index} className={item.esPareto ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="border p-1 sm:p-2 text-center">{index + 1}</td>
                    <td className="border p-1 sm:p-2 truncate max-w-[80px] sm:max-w-none" title={item.causa}>
                      {item.causa}
                    </td>
                    <td className="border p-1 sm:p-2 text-right font-medium">{item.minutos}</td>
                    <td className="border p-1 sm:p-2 text-right">{item.porcentaje}%</td>
                    <td className="border p-1 sm:p-2 text-right">{item.porcentajeAcumulado}%</td>
                    <td className="border p-1 sm:p-2 text-center text-[10px] sm:text-sm">
                      {item.esPareto ? '✅ 80%' : '⬆️ 20%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla principal - Scroll horizontal en móvil */}
      <div className="overflow-x-auto max-h-[550px] overflow-y-auto border rounded">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando datos...</div>
        ) : parosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay registros que coincidan con los filtros
          </div>
        ) : (
          <table className="w-full border text-[10px] sm:text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-1 sm:p-2 whitespace-nowrap">Fecha</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap">Máq.</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap hidden xs:table-cell">Operador</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap">Tipo</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap hidden sm:table-cell">Origen</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap">Min</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap hidden md:table-cell">Paro/Hecho</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap">Causa</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap hidden lg:table-cell">Acción</th>
                <th className="border p-1 sm:p-2 whitespace-nowrap hidden xl:table-cell">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {parosFiltrados.map((p, i) => (
                <tr key={i} className="text-center hover:bg-gray-50">
                  <td className="border p-1 sm:p-2 whitespace-nowrap">{p.fecha}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap">{p.maquina}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap hidden xs:table-cell">{p.operador}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap">{p.tipo}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap hidden sm:table-cell">{p.origen || "-"}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap">{p.minutos}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap hidden md:table-cell font-semibold">{p.hecho}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap">{p.causa}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap hidden lg:table-cell">{p.accion}</td>
                  <td className="border p-1 sm:p-2 whitespace-nowrap hidden xl:table-cell">{p.comentario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
