import { defineCommand } from 'zodline';
import { deleteConfig } from '../utils/config';
import { defineCommandOptions } from '../utils/options';
import { printJson } from '../utils/output';

export default defineCommand({
  description: 'Log out and delete the stored credentials.',
  examples: ['engine4 logout', 'engine4 logout --json'],
  options: defineCommandOptions({}),
  action: async (options) => {
    const wasLoggedIn = deleteConfig();
    if (options.json) {
      printJson({ wasLoggedIn });
    } else {
      process.stdout.write(wasLoggedIn ? 'Logged out.\n' : 'Not logged in.\n');
    }
  },
});
