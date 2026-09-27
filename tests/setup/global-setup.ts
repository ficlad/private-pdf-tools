/**
 * Vitest global setup: (re)generate the programmatic fixtures so tests never
 * depend on checked-in binaries.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { generateFixtures } from '../../scripts/generate-fixtures';

export default async function setup(): Promise<void> {
  const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  await generateFixtures(join(repoRoot, 'fixtures'));
}
