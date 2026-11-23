import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/** Previously showed hard-coded sample data as if it were the athlete's own (removed). */
export default function Screen() {
  return (
    <NotAvailableScreen
      title="Race Predictions"
      reason="Predictions need enough real race-pace history; this is not implemented yet."
    />
  );
}
