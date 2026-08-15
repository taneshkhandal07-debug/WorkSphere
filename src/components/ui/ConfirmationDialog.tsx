import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'primary';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  variant = 'primary',
}) => {
  const footer = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button variant={variant} size="sm" onClick={onConfirm} loading={isLoading}>
        {confirmLabel}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
        {description}
      </p>
    </Modal>
  );
};
export default ConfirmationDialog;
