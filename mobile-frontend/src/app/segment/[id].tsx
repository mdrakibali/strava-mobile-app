import React from 'react';
import { NotAvailableScreen } from '../../components/common/NotAvailableScreen';

/**
 * Segments are out of MVP scope (no segment matching or leaderboards are computed). This screen
 * previously fell back to an invented segment, KOM time and "Local Legend" name.
 */
export default function SegmentScreen() {
  return (
    <NotAvailableScreen
      title="Segments"
      reason="Segment matching and leaderboards are not implemented yet."
    />
  );
}
