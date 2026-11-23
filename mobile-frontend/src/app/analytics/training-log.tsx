import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/** Previously showed hard-coded sample data as if it were the athlete's own (removed). */
export default function Screen() {
  return (
    <NotAvailableScreen
      title="Training Log"
      reason="It needs a weekly history endpoint. Your real activities are in You → Activities."
    />
  );
}
