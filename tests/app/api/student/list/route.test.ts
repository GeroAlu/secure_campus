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
      return async (req: NextRequest, context: unknown) => {
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
    expect(mockHandle).toHaveBeenCalledWith({ page: 1, limit: 10, includeInactive: true });
  });

  it('should successfully obfuscate student emails and other details for non-admins (students), but allow viewing own detail', async () => {
    mockUserRolePassedToWithPermission = 'student'; // mock user ID is 'user_123'
    const studentListResponse = {
      list: [
        { id: 'other_student', name: 'John Doe', email: 'john@example.com', active: true, detail: 'Secret info' },
        { id: 'user_123', name: 'Jane Smith', email: 'jane@example.com', active: true, detail: 'My own comment' },
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
    // Emails are obfuscated for both
    expect(body.list[0].email).toBe('');
    expect(body.list[1].email).toBe('');
    // Detail for other student is null
    expect(body.list[0].detail).toBeNull();
    // Detail for logged-in student is visible
    expect(body.list[1].detail).toBe('My own comment');
  });
});
