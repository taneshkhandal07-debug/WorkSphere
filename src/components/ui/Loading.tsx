import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 24, className = '' }) => (
  <div 
    style={{ 
      display: 'flex', 
      width: '100%', 
      height: '100%', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100px',
      padding: '20px'
    }}
  >
    <div 
      className={`spinner ${className}`} 
      style={{ width: `${size}px`, height: `${size}px` }} 
    />
  </div>
);

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  className = '',
  style,
}) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width,
      height,
      ...style,
    }}
  />
);
