import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/** Previously showed hard-coded sample data as if it were the athlete's own (removed). */
export default function Screen() {
  return (
    <NotAvailableScreen
      title="Fitness & Freshness"
      reason="It needs heart-rate based training load, which this app does not record yet."
    />
  );
}
