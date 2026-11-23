import { LatLngPoint } from './privacy';

export const escapeXml = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!
  );

export function buildGpx(
  title: string,
  sportType: string,
  startTime: string | Date,
  points: LatLngPoint[]
): string {
  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${Number(p.latitude)}" lon="${Number(p.longitude)}">` +
        (p.altitude != null ? `<ele>${Number(p.altitude)}</ele>` : '') +
        (p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : '') +
        `</trkpt>`
    )
    .join('\n');
  const escapedTitle = escapeXml(title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="OpenStrava" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapedTitle}</name>
    <time>${new Date(startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapedTitle}</name>
    <type>${escapeXml(sportType)}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}
