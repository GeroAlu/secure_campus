import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'lib/validation.ts',
        'application/command/AddStudentHandler.ts',
        'application/query/GetStudentsListHandler.ts',
        'application/command/AddMessageHandler.ts',
        'app/actions/roles.ts',
        'app/actions/sync-user.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
