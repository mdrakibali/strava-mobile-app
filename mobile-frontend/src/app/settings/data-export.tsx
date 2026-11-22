import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/**
 * Bulk data archive export is not supported on mobile yet.
 * Individual activities can be exported as GPX files directly from their details screen.
 */
export default function DataExportScreen() {
  return (
    <NotAvailableScreen
      title="Data Portability & Export"
      reason="Bulk account export archive is not supported yet. You can export any of your individual workouts as a GPX file directly from its activity details screen."
    />
  );
}
