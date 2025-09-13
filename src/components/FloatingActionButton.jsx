import React, { useState } from 'react';

/**
 * Floating Action Button Component
 * Provides quick access to common actions with hover effects and tooltips
 */
const FloatingActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  className = 'bg-blue-500 hover:bg-blue-600',
  size = 'md',
  disabled = false,
  badge = null,
  tooltip = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          ${sizeClasses[size]} 
          ${className}
          text-white rounded-full shadow-lg 
          flex items-center justify-center
          transition-all duration-200 ease-in-out
          transform hover:scale-110 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          relative overflow-hidden
        `}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={label}
      >
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-200" />
        
        {/* Icon */}
        <Icon size={iconSizes[size]} className="relative z-10" />
        
        {/* Badge */}
        {badge && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
            {badge}
          </div>
        )}
      </button>

      {/* Tooltip */}
      {tooltip && showTooltip && label && (
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 z-50">
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            {label}
            {/* Arrow */}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingActionButton;