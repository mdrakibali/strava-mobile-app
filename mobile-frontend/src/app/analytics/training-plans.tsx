import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/** Previously showed hard-coded sample data as if it were the athlete's own (removed). */
export default function Screen() {
  return (
    <NotAvailableScreen title="Training Plans" reason="Training plans are not implemented yet." />
  );
}
