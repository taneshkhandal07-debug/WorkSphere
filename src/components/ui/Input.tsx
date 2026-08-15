import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', style, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && <label className="input-label">{label}</label>}
        <input
          ref={ref}
          className={`input-field ${className}`}
          style={{
            borderColor: error ? 'var(--error-color)' : undefined,
            boxShadow: error ? '0 0 0 2px var(--error-bg)' : undefined,
            ...style
          }}
          {...props}
        />
        {error && <span className="input-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
