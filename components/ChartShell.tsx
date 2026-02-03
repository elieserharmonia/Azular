
import React, { useState, useEffect, useRef } from 'react';
import { useMounted } from '../hooks/useMounted';
import { AlertCircle, BarChart2, List } from 'lucide-react';

interface ChartShellProps {
  title?: string;
  children: React.ReactNode;
  fallback: React.ReactNode;
  heightClass?: string;
  hasData?: boolean;
}

const ChartShell: React.FC<ChartShellProps> = ({ 
  title, 
  children, 
  fallback,
  heightClass = "h-72",
  hasData = true 
}) => {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<'chart' | 'data'>('chart');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          setShowError(false);
        }
      }
    });

    observer.observe(containerRef.current);
    
    // Timeout de segurança: se após 500ms não houver dimensão, algo está errado
    const timer = setTimeout(() => {
      if (dimensions.width === 0) setShowError(true);
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (!hasData) {
    return (
      <div className={`bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-blue-50 flex flex-col items-center justify-center ${heightClass}`}>
        <AlertCircle className="text-blue-100 mb-2" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Sem dados para este período</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-50 flex flex-col w-full min-w-0">
      <div className="flex justify-between items-center mb-6">
        {title && (
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {title}
          </h3>
        )}
        <div className="flex bg-blue-50 p-1 rounded-xl">
          <button 
            onClick={() => setView('chart')}
            className={`p-2 rounded-lg transition-all ${view === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
          >
            <BarChart2 size={16} />
          </button>
          <button 
            onClick={() => setView('data')}
            className={`p-2 rounded-lg transition-all ${view === 'data' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div ref={containerRef} className={`w-full min-w-0 relative flex-1 ${heightClass}`}>
        {mounted && view === 'chart' && !showError && dimensions.width > 0 ? (
          <div className="w-full h-full min-w-0">
            {children}
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto no-scrollbar">
            {fallback}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartShell;
