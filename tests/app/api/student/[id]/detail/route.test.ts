import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/student/[id]/detail/route';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();
let mockUserRolePassedToWithPermission = 'student';

vi.mock('@/application/command/UpdateStudentDetailHandler', () => {
  return {
    UpdateStudentDetailHandler: class MockUpdateStudentDetailHandler {
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

describe('Student Detail API Route (PATCH)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRolePassedToWithPermission = 'student';
  });

  it('should return 400 if detail parameter is invalid', async () => {
    const rawReq = new Request('http://localhost/api/student/user_123/detail', {
      method: 'PATCH',
      body: JSON.stringify({ detail: 123 }), // should be string
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Parámetros inválidos');
  });

  it('should return 400 if student ID is missing', async () => {
    const rawReq = new Request('http://localhost/api/student//detail', {
      method: 'PATCH',
      body: JSON.stringify({ detail: 'Un detalle' }),
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: '' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('ID de estudiante requerido.');
  });

  it('should successfully update student detail for authorized admin role', async () => {
    mockUserRolePassedToWithPermission = 'admin';
    mockHandle.mockResolvedValue(undefined);

    const rawReq = new Request('http://localhost/api/student/user_123/detail', {
      method: 'PATCH',
      body: JSON.stringify({ detail: 'Un detalle de prueba' }),
    });
    const req = new NextRequest(rawReq);

    const res = await PATCH(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockHandle).toHaveBeenCalledWith({ studentId: 'user_123', detail: 'Un detalle de prueba' });
  });
});
