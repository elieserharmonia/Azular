
import React from 'react';
import { useMounted } from '../hooks/useMounted';

interface ChartBoxProps {
  title?: string;
  children: React.ReactNode;
  heightClass?: string;
  hasData?: boolean;
  loading?: boolean;
}

const ChartBox: React.FC<ChartBoxProps> = ({ 
  title, 
  children, 
  heightClass = "h-[300px]", 
  hasData = true,
  loading = false
}) => {
  const mounted = useMounted();

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-50 w-full min-w-0 overflow-hidden flex flex-col">
      {title && (
        <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-gray-400">
          {title}
        </h3>
      )}
      
      {/* Contêiner com altura fixa e min-w-0 obrigatório para ResponsiveContainer */}
      <div className={`${heightClass} w-full min-w-0 relative flex-1`}>
        {mounted && !loading && hasData ? (
          <div className="w-full h-full min-w-0">
            {children}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            {!mounted || loading ? (
              <>
                <div className="w-8 h-8 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="font-bold uppercase text-[10px] tracking-widest text-blue-300">Azulando Gráfico...</span>
              </>
            ) : (
              <span className="font-bold uppercase text-[10px] tracking-widest">Sem dados para este período</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartBox;
