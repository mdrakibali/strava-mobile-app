import { Activity } from '../types';

/**
 * Generates standard GPX 1.1 XML string from an Activity object.
 * Compatible with Garmin Connect, Strava, Coros, Wahoo, and Suunto.
 */
export const generateGpxXml = (activity: Activity): string => {
  const points = activity.routePoints || [];
  const startTime = activity.startTime
    ? new Date(activity.startTime).toISOString()
    : new Date().toISOString();

  let trkpts = '';
  points.forEach((pt: any, index) => {
    const lat = pt.latitude || pt[1];
    const lon = pt.longitude || pt[0];
    const ele = pt.altitude !== undefined ? `<ele>${pt.altitude}</ele>` : '<ele>10.0</ele>';

    // Increment time per point based on elapsed duration
    const ptTime = new Date(
      new Date(startTime).getTime() +
        index * (activity.movingTimeSeconds / Math.max(1, points.length)) * 1000
    ).toISOString();

    trkpts += `      <trkpt lat="${lat}" lon="${lon}">
        ${ele}
        <time>${ptTime}</time>
      </trkpt>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Kinetix - GPS Athletic Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(activity.title)}</name>
    <time>${startTime}</time>
    <author>
      <name>${escapeXml(activity.athlete?.displayName || 'Athlete')}</name>
    </author>
  </metadata>
  <trk>
    <name>${escapeXml(activity.title)}</name>
    <type>${activity.sportType || 'Run'}</type>
    <trkseg>
${trkpts}    </trkseg>
  </trk>
</gpx>`;
};

const escapeXml = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
};
