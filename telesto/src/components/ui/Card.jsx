import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  title, 
  icon = null,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {title && (
        <div className={`p-4 border-b border-slate-700 ${headerClassName}`}>
          <h3 className="text-lg font-semibold flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h3>
        </div>
      )}
      <div className={`p-4 ${bodyClassName}`}>
        {children}
      </div>
    </motion.div>
  );
};

export default Card;