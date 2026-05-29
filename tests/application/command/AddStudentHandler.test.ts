import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AddStudentHandler, AddStudentCommand } from '../../../application/command/AddStudentHandler';
import pool from '../../../lib/db';

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
    getEncryptionKey: vi.fn(() => 'mock-encryption-key'),
  };
});

describe('AddStudentHandler', () => {
  let handler: AddStudentHandler;

  beforeEach(() => {
    handler = new AddStudentHandler();
    vi.clearAllMocks();
  });

  it('should successfully add a student', async () => {
    const command: AddStudentCommand = {
      clerkId: 'user_12345',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({
      rowCount: 1,
      rows: [],
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    await expect(handler.handle(command)).resolves.not.toThrow();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('INSERT INTO public.users');
    expect(params).toEqual([
      'user_12345',
      'Jane',
      'Smith',
      'jane.smith@example.com',
      'Estudiante',
      'mock-encryption-key',
    ]);
  });

  it('should throw an error if the input validation fails', async () => {
    const command: AddStudentCommand = {
      clerkId: '', // Invalid empty ID
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'invalid-email',
    };

    await expect(handler.handle(command)).rejects.toThrow('Invalid student data');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should propagate database error if the insertion fails', async () => {
    const command: AddStudentCommand = {
      clerkId: 'user_123',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    };

    const dbError = new Error('Unique constraint violation');
    vi.spyOn(pool, 'query').mockRejectedValue(dbError);

    await expect(handler.handle(command)).rejects.toThrow('Unique constraint violation');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
