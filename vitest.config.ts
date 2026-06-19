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
        'app/api/chat/route.ts',
        'app/api/student/list/route.ts',
        'app/api/student/[id]/active/route.ts',
        'app/api/student/[id]/detail/route.ts',
        'app/api/student/[id]/dni/route.ts',
        'application/command/SetStudentActiveHandler.ts',
        'application/command/UpdateStudentDetailHandler.ts',
        'application/query/GetStudentDniHandler.ts',
        'app/lib/withPermission.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
