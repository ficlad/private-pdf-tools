import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { generateFixtures } from '../../scripts/generate-fixtures';

export default async function globalSetup(): Promise<void> {
  const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  await generateFixtures(join(repoRoot, 'fixtures'));
}
