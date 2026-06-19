import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GetStudentDniHandler } from '../../../application/query/GetStudentDniHandler';
import pool from '../../../lib/db';

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
    getEncryptionKey: vi.fn(() => 'mock-encryption-key-123'),
  };
});

describe('GetStudentDniHandler', () => {
  let handler: GetStudentDniHandler;

  beforeEach(() => {
    handler = new GetStudentDniHandler();
    vi.clearAllMocks();
  });

  it('should successfully get decrypted DNI by UUID', async () => {
    const query = {
      studentId: '12345678-1234-1234-1234-123456789012',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({
      rows: [{ dni: '12345678' }],
    });

    const response = await handler.handle(query);

    expect(response).toEqual({ dni: '12345678' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('SELECT pgp_sym_decrypt(dni_encrypted, $1::text)::text AS dni');
    expect(sqlQuery).toContain('WHERE id = $2::uuid');
    expect(params).toEqual(['mock-encryption-key-123', '12345678-1234-1234-1234-123456789012']);
  });

  it('should successfully get decrypted DNI by Clerk ID', async () => {
    const query = {
      studentId: 'user_12345',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({
      rows: [{ dni: '87654321' }],
    });

    const response = await handler.handle(query);

    expect(response).toEqual({ dni: '87654321' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = mockQuery.mock.calls[0];
    expect(sqlQuery).toContain('SELECT pgp_sym_decrypt(dni_encrypted, $1::text)::text AS dni');
    expect(sqlQuery).toContain('WHERE clerk_id_hash = encode(digest($2::text, \'sha256\'), \'hex\')');
    expect(params).toEqual(['mock-encryption-key-123', 'user_12345']);
  });

  it('should return null if user is not found or has no DNI', async () => {
    const query = {
      studentId: 'user_not_found',
    };

    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({
      rows: [],
    });

    const response = await handler.handle(query);

    expect(response).toEqual({ dni: null });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
