import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/student/[id]/dni/route';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();
let mockUserRolePassedToWithPermission = 'student';

vi.mock('@/application/query/GetStudentDniHandler', () => {
  return {
    GetStudentDniHandler: class MockGetStudentDniHandler {
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

describe('Student DNI API Route (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRolePassedToWithPermission = 'student';
  });

  it('should return 400 if student ID is missing', async () => {
    const rawReq = new Request('http://localhost/api/student//dni');
    const req = new NextRequest(rawReq);

    const res = await GET(req, { params: Promise.resolve({ id: '' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('ID de estudiante requerido.');
  });

  it('should successfully return decrypted DNI for authorized admin role', async () => {
    mockUserRolePassedToWithPermission = 'admin';
    mockHandle.mockResolvedValue({ dni: '12345678' });

    const rawReq = new Request('http://localhost/api/student/user_123/dni');
    const req = new NextRequest(rawReq);

    const res = await GET(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.dni).toBe('12345678');
    expect(mockHandle).toHaveBeenCalledWith({ studentId: 'user_123' });
  });

  it('should return 404 if DNI is not found or not set', async () => {
    mockUserRolePassedToWithPermission = 'admin';
    mockHandle.mockResolvedValue({ dni: null });

    const rawReq = new Request('http://localhost/api/student/user_123/dni');
    const req = new NextRequest(rawReq);

    const res = await GET(req, { params: Promise.resolve({ id: 'user_123' }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Estudiante no encontrado o DNI no configurado.');
  });
});
