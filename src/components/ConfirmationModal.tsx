import React from 'react';
import ConfirmationDialog, { ConfirmationDialogProps } from './ConfirmationDialog';

export type ConfirmationModalProps = ConfirmationDialogProps;

export default function ConfirmationModal(props: ConfirmationModalProps) {
  return <ConfirmationDialog {...props} />;
}
