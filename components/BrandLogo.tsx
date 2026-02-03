
import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
  light?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = "", variant = 'full', light = false }) => {
  const primaryColor = light ? "#FFFFFF" : "#2563EB";
  const secondaryColor = light ? "rgba(255,255,255,0.7)" : "#60A5FA";

  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Fundo do Ícone */}
        <rect width="100" height="100" rx="28" fill={light ? "rgba(255,255,255,0.1)" : "#F0F7FF"} />
        
        {/* O "A" em forma de Abrigo/Casa */}
        <path 
          d="M50 25L25 50V75H75V50L50 25Z" 
          stroke={primaryColor} 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* A Onda Azular (Traço do A) */}
        <path 
          d="M35 55C40 52 45 52 50 55C55 58 60 58 65 55" 
          stroke={secondaryColor} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
        
        {/* Ponto de Estabilidade */}
        <circle cx="50" cy="75" r="4" fill={primaryColor} />
      </svg>
      
      {variant === 'full' && (
        <span 
          className={`font-black uppercase tracking-tighter text-2xl ${light ? 'text-white' : 'text-blue-700'}`}
          style={{ fontSize: size * 0.6 }}
        >
          Azular
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
