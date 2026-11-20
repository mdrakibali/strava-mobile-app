/**
 * Single import point for the shared, platform-free tracking core (repo-root `shared/tracking`),
 * which the Cloudflare Worker also compiles. Metro resolves it through `watchFolders`.
 */
export * from '../../../shared/tracking';
