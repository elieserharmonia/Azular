
import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface BarData {
  name: string;
  plannedIncome: number;
  realIncome: number;
  plannedExpense: number;
  realExpense: number;
}

interface SimpleBarsProps {
  data: BarData[];
}

const SimpleBars: React.FC<SimpleBarsProps> = ({ data }) => {
  const maxVal = Math.max(...data.flatMap(d => [d.plannedIncome, d.realIncome, d.plannedExpense, d.realExpense]), 100);

  const getWidth = (val: number) => `${Math.max(2, (val / maxVal) * 100)}%`;

  return (
    <div className="space-y-6 py-2">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-gray-500">{item.name}</span>
          </div>
          
          <div className="space-y-1.5">
            {/* Entradas */}
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden flex gap-0.5">
                <div 
                  style={{ 
                    width: getWidth(item.plannedIncome),
                    backgroundImage: 'linear-gradient(45deg, #bfdbfe 25%, transparent 25%, transparent 50%, #bfdbfe 50%, #bfdbfe 75%, transparent 75%, transparent)' ,
                    backgroundSize: '8px 8px'
                  }} 
                  className="h-full bg-blue-100 opacity-50"
                  title={`Planejado: ${formatCurrency(item.plannedIncome)}`}
                />
                <div 
                  style={{ width: getWidth(item.realIncome) }} 
                  className="h-full bg-blue-600 rounded-r-full"
                  title={`Real: ${formatCurrency(item.realIncome)}`}
                />
              </div>
            </div>

            {/* Saídas */}
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden flex gap-0.5">
                <div 
                  style={{ 
                    width: getWidth(item.plannedExpense),
                    backgroundImage: 'linear-gradient(45deg, #fecaca 25%, transparent 25%, transparent 50%, #fecaca 50%, #fecaca 75%, transparent 75%, transparent)' ,
                    backgroundSize: '8px 8px'
                  }} 
                  className="h-full bg-red-100 opacity-50"
                  title={`Planejado: ${formatCurrency(item.plannedExpense)}`}
                />
                <div 
                  style={{ width: getWidth(item.realExpense) }} 
                  className="h-full bg-red-500 rounded-r-full"
                  title={`Real: ${formatCurrency(item.realExpense)}`}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Entrada Real</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Saída Real</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gray-200 rounded-sm overflow-hidden" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 50%, #ccc 50%, #ccc 75%, transparent 75%, transparent)', backgroundSize: '4px 4px' }}></div>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Planejado</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleBars;
