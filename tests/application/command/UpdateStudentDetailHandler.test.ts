import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { UpdateStudentDetailHandler } from '../../../application/command/UpdateStudentDetailHandler';
import pool from '../../../lib/db';

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
  };
});

describe('UpdateStudentDetailHandler', () => {
  let handler: UpdateStudentDetailHandler;

  beforeEach(() => {
    handler = new UpdateStudentDetailHandler();
    vi.clearAllMocks();
  });

  it('should successfully update student detail by UUID', async () => {
    const command = {
      studentId: '12345678-1234-1234-1234-123456789012',
      detail: 'Detalle de prueba UUID',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await expect(handler.handle(command)).resolves.not.toThrow();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('UPDATE public.users SET detail = $1 WHERE id = $2::uuid');
    expect(params).toEqual(['Detalle de prueba UUID', '12345678-1234-1234-1234-123456789012']);
  });

  it('should successfully update student detail by Clerk ID', async () => {
    const command = {
      studentId: 'user_12345',
      detail: 'Detalle de prueba Clerk ID',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({ rowCount: 1 });

    await expect(handler.handle(command)).resolves.not.toThrow();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('UPDATE public.users SET detail = $1 WHERE clerk_id_hash = encode(digest($2::text, \'sha256\'), \'hex\')');
    expect(params).toEqual(['Detalle de prueba Clerk ID', 'user_12345']);
  });

  it('should throw an error if validation fails due to empty studentId', async () => {
    const command = {
      studentId: '',
      detail: 'Detalle sin estudiante',
    };

    await expect(handler.handle(command)).rejects.toThrow('Datos inválidos para actualizar detalle');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
