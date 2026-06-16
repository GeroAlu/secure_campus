import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SetStudentActiveHandler } from '../../../application/command/SetStudentActiveHandler';
import pool from '../../../lib/db';

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
  };
});

describe('SetStudentActiveHandler', () => {
  let handler: SetStudentActiveHandler;

  beforeEach(() => {
    handler = new SetStudentActiveHandler();
    vi.clearAllMocks();
  });

  it('should successfully update active status by UUID', async () => {
    const command = {
      studentId: '12345678-1234-1234-1234-123456789012',
      active: false,
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await expect(handler.handle(command)).resolves.not.toThrow();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('UPDATE public.users SET active = $1 WHERE id = $2::uuid');
    expect(params).toEqual([false, '12345678-1234-1234-1234-123456789012']);
  });

  it('should successfully update active status by Clerk ID', async () => {
    const command = {
      studentId: 'user_12345',
      active: true,
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await expect(handler.handle(command)).resolves.not.toThrow();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('UPDATE public.users SET active = $1 WHERE clerk_id_hash = encode(digest($2::text, \'sha256\'), \'hex\')');
    expect(params).toEqual([true, 'user_12345']);
  });

  it('should throw an error if validation fails', async () => {
    const command = {
      studentId: '',
      active: true,
    };

    await expect(handler.handle(command)).rejects.toThrow('Datos inválidos para actualizar estado activo');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
