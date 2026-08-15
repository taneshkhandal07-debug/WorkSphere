import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <div className="table-container">
    <table className={`table ${className}`}>{children}</table>
  </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody>{children}</tbody>
);

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', onClick, style }) => (
  <tr 
    className={`tr ${className}`} 
    onClick={onClick} 
    style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
  >
    {children}
  </tr>
);

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className = '', style }) => (
  <th className={`th ${className}`} style={style}>{children}</th>
);

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', style }) => (
  <td className={`td ${className}`} style={style}>{children}</td>
);
