import React from 'react';
import { TicketAuditReport } from '../types';
import AlertDispatchCenter from './AlertDispatchCenter';

interface AlertsConfigPageProps {
  reports: TicketAuditReport[];
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
  enabledColors?: string[];
  setEnabledColors?: React.Dispatch<React.SetStateAction<string[]>>;
  bypassTriggerFilters?: boolean;
  setBypassTriggerFilters?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AlertsConfigPage({ 
  reports, 
  triggerPopup,
}: AlertsConfigPageProps) {
  return (
    <div className="animate-fadeIn">
      <AlertDispatchCenter reports={reports} triggerPopup={triggerPopup} />
    </div>
  );
}
