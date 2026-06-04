import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/student/list/route';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();
let mockUserRolePassedToWithPermission = 'student';

vi.mock('@/application/query/GetStudentsListHandler', () => {
  return {
    GetStudentsListHandler: class MockGetStudentsListHandler {
      handle = mockHandle;
    },
  };
});

vi.mock('@/app/lib/withPermission', () => {
  return {
    withPermission: vi.fn((permission, handler) => {
      return async (req: any, context: any) => {
        return handler(req, {
          userId: 'user_123',
          role: mockUserRolePassedToWithPermission,
          email: 'user@example.com',
          jwt: 'mock_jwt'
        }, context);
      };
    }),
  };
});

describe('Student List API Route (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRolePassedToWithPermission = 'student';
  });

  it('should return 400 if pagination parameters are invalid', async () => {
    const rawReq = new Request('http://localhost/api/student/list?page=-1');
    const req = new NextRequest(rawReq);

    const res = await GET(req, {});
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Parámetros inválidos');
  });

  it('should successfully return student list with emails for admins (without obfuscation)', async () => {
    mockUserRolePassedToWithPermission = 'admin';
    const studentListResponse = {
      list: [
        { id: '1', name: 'John Doe', email: 'john@example.com', active: true },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', active: true },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 2,
    };
    mockHandle.mockResolvedValue(studentListResponse);

    const rawReq = new Request('http://localhost/api/student/list?page=1&limit=10');
    const req = new NextRequest(rawReq);

    const res = await GET(req, {});
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.list).toHaveLength(2);
    expect(body.list[0].email).toBe('john@example.com'); // Not obfuscated
    expect(body.list[1].email).toBe('jane@example.com');
    expect(mockHandle).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('should successfully obfuscate student emails for non-admins (students)', async () => {
    mockUserRolePassedToWithPermission = 'student';
    const studentListResponse = {
      list: [
        { id: '1', name: 'John Doe', email: 'john@example.com', active: true },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    };
    mockHandle.mockResolvedValue(studentListResponse);

    const rawReq = new Request('http://localhost/api/student/list?page=1&limit=10');
    const req = new NextRequest(rawReq);

    const res = await GET(req, {});
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.list).toHaveLength(1);
    expect(body.list[0].email).toBe(''); // Obfuscated!
  });
});
