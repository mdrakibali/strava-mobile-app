import React from 'react';
import { View } from 'react-native';
import { AppText, SectionTitle } from '../../design';
import { DASH } from '../../lib/format';
import { SplitView } from '../../lib/activityView';
import { ElevationProfile } from './ElevationProfile';

interface Props {
  splits: SplitView[];
  elevationProfile: number[];
  showSplits: boolean;
}

export const ActivitySplits: React.FC<Props> = ({ splits, elevationProfile, showSplits }) => {
  return (
    <View>
      {showSplits && splits.length > 0 ? (
        <View className="mt-6 pt-6 border-t border-gray-100">
          <SectionTitle title="Splits" />
          <View className="flex-row pb-2">
            <AppText variant="label" color="inkSecondary" style={{ width: 48 }}>
              Km
            </AppText>
            <AppText variant="label" color="inkSecondary" style={{ flex: 1 }}>
              Pace
            </AppText>
            <AppText variant="label" color="inkSecondary" style={{ width: 80, textAlign: 'right' }}>
              Elev
            </AppText>
          </View>
          {splits.map((s) => (
            <View key={s.index} className="flex-row items-center min-h-[40px] border-t border-gray-100">
              <AppText variant="bodyStrong" style={{ width: 48 }}>
                {s.index}
              </AppText>
              <AppText variant="bodyStrong" style={[{ flex: 1 }, { fontVariant: ['tabular-nums'] }]}>
                {s.pace ? `${s.pace} /km` : DASH}
              </AppText>
              <AppText variant="body" color="inkSecondary" style={{ width: 80, textAlign: 'right' }}>
                {s.elevationDeltaMeters == null
                  ? DASH
                  : `${s.elevationDeltaMeters > 0 ? '+' : ''}${Math.round(s.elevationDeltaMeters)} m`}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {elevationProfile.length > 1 ? (
        <View className="mt-6 pt-6 border-t border-gray-100">
          <SectionTitle title="Elevation" />
          <ElevationProfile samples={elevationProfile} />
        </View>
      ) : null}
    </View>
  );
};
