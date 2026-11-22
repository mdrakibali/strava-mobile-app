import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/**
 * File upload / external GPX parsing is not supported on mobile yet.
 * Activities should be recorded directly with GPS via the Record tab.
 */
export default function ImportGpxScreen() {
  return (
    <NotAvailableScreen
      title="Import Activity"
      reason="Direct device file import (GPX/FIT) is not supported on mobile yet. Record your workouts live in the Record tab."
    />
  );
}
