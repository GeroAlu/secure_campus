import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GetStudentsListHandler, GetStudentsListQuery } from '../../../application/query/GetStudentsListHandler';
import pool from '../../../lib/db';

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
    getEncryptionKey: vi.fn(() => 'mock-encryption-key'),
  };
});

describe('GetStudentsListHandler', () => {
  let handler: GetStudentsListHandler;

  beforeEach(() => {
    handler = new GetStudentsListHandler();
    vi.clearAllMocks();
  });

  it('should successfully return paginated list of students', async () => {
    const query: GetStudentsListQuery = {
      page: 2,
      limit: 5,
    };

    // First query: COUNT(*)
    // Second query: SELECT user details
    const countMock = { rows: [{ count: '12' }] };
    const usersMock = {
      rows: [
        {
          id: '1',
          clerk_id: 'clerk_1',
          first_name: 'Alice',
          last_name: 'Jones',
          email: 'alice@example.com',
          active: true,
        },
        {
          id: '2',
          clerk_id: null,
          first_name: 'Bob',
          last_name: null,
          email: 'bob@example.com',
          active: false,
        },
      ],
    };

    const mockQuery = (vi.mocked(pool.query) as Mock)
      .mockResolvedValueOnce(countMock)
      .mockResolvedValueOnce(usersMock);

    const response = await handler.handle(query);

    expect(response.currentPage).toBe(2);
    expect(response.totalItems).toBe(12);
    expect(response.totalPages).toBe(3); // 12 items / 5 per page = 2.4 => 3 pages
    expect(response.list).toHaveLength(2);

    expect(response.list[0]).toEqual({
      id: 'clerk_1',
      name: 'Alice Jones',
      email: 'alice@example.com',
      active: true,
      detail: null,
    });

    expect(response.list[1]).toEqual({
      id: '2', // Fallback to id because clerk_id is null
      name: 'Bob',
      email: 'bob@example.com',
      active: false,
      detail: null,
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT COUNT(*)');
    expect(mockQuery.mock.calls[1][0]).toContain('pgp_sym_decrypt');
    expect(mockQuery.mock.calls[1][1]).toEqual([5, 5, 'mock-encryption-key']); // limit=5, offset=5, key
  });

  it('should fallback to defaults when page and limit are missing', async () => {
    const query: GetStudentsListQuery = {};

    const countMock = { rows: [{ count: '3' }] };
    const usersMock = { rows: [] };

    (vi.mocked(pool.query) as Mock)
      .mockResolvedValueOnce(countMock)
      .mockResolvedValueOnce(usersMock);

    const response = await handler.handle(query);

    expect(response.currentPage).toBe(1); // default
    expect(response.totalPages).toBe(1);
    expect(response.totalItems).toBe(3);
  });

  it('should handle pagination schema validation failure', async () => {
    const query: GetStudentsListQuery = {
      page: -1, // Invalid negative page
    };

    await expect(handler.handle(query)).rejects.toThrow('Invalid pagination');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should handle db errors gracefully and return empty list', async () => {
    const query: GetStudentsListQuery = { page: 1, limit: 10 };

    (vi.mocked(pool.query) as Mock).mockRejectedValue(new Error('DB Connection Timeout'));

    const response = await handler.handle(query);

    expect(response.list).toEqual([]);
    expect(response.totalItems).toBe(0);
    expect(response.totalPages).toBe(1);
  });
});
