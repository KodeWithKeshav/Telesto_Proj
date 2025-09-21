import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ 
  progress, 
  label = null,
  showPercentage = true,
  className = '',
  size = 'md',
  variant = 'primary'
}) => {
  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const variants = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-orange-600',
    danger: 'bg-red-600'
  };
  
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
          {showPercentage && <span className="text-sm text-slate-400">{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${sizes[size]}`}>
        <motion.div
          className={`${sizes[size]} ${variants[variant]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;