import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK, recordingEngine } from './engine';

/**
 * Background location task. MUST be defined at module scope and imported from the app entry
 * (index.js) so it exists when Android starts JS just to deliver locations (headless context).
 * Fixes are written to SQLite first (engine.ingest), so nothing depends on a screen being mounted.
 */
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[location-task]', error.message);
    return;
  }
  const locations = data?.locations ?? [];
  if (!locations.length) return;
  try {
    await recordingEngine.load(false);
    await recordingEngine.ingest(locations);
  } catch (e) {
    console.warn('[location-task] failed to store fixes', e);
  }
});
