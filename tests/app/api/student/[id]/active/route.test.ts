import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/student/[id]/active/route';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();
let mockUserRolePassedToWithPermission = 'student';

vi.mock('@/application/command/SetStudentActiveHandler', () => {
  return {
    SetStudentActiveHandler: class MockSetStudentActiveHandler {
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

describe('Student Active API Route (PATCH)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRolePassedToWithPermission = 'student';
  });

  it('should return 400 if student ID is missing', async () => {
    const rawReq = new Request('http://localhost/api/student//active', {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: '' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('ID de estudiante requerido.');
  });

  it('should return 400 if active parameter is missing or invalid type', async () => {
    const rawReq = new Request('http://localhost/api/student/user_123/active', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Parámetros inválidos');
  });

  it('should successfully update active status for authorized roles', async () => {
    mockUserRolePassedToWithPermission = 'admin';
    mockHandle.mockResolvedValue(undefined);

    const rawReq = new Request('http://localhost/api/student/user_123/active', {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockHandle).toHaveBeenCalledWith({ studentId: 'user_123', active: false });
  });
});
