import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  style,
}) => {
  const getInitials = (nameStr: string) => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeClass = `avatar-${size}`;

  return (
    <div className={`avatar ${sizeClass} ${className}`} title={name} style={style}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
export default Avatar;
