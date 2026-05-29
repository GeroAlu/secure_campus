import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/student/list/route';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockHandle = vi.fn();

vi.mock('@clerk/nextjs/server', () => {
  return {
    auth: vi.fn(),
    clerkClient: () =>
      Promise.resolve({
        users: {
          getUser: mockGetUser,
        },
      }),
  };
});

vi.mock('@/application/query/GetStudentsListHandler', () => {
  return {
    GetStudentsListHandler: class MockGetStudentsListHandler {
      handle = mockHandle;
    },
  };
});

vi.mock('@/app/utils/permissions', () => {
  return {
    getPermissionsForRole: vi.fn((role) => {
      if (role === 'Administrador') return ['*'];
      if (role === 'Docente') return ['view:student_details'];
      return []; // Student has no permissions
    }),
  };
});

describe('Student List API Route (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'mock-encryption-key-that-is-32-chars-long';
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);

    const rawReq = new Request('http://localhost/api/student/list');
    const req = new NextRequest(rawReq);

    const res = await GET(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('No autenticado');
  });

  it('should return 400 if pagination parameters are invalid', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUser.mockResolvedValue({
      id: 'user_docente',
      publicMetadata: { role: 'Docente' },
    });

    const rawReq = new Request('http://localhost/api/student/list?page=-1');
    const req = new NextRequest(rawReq);

    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Parámetros inválidos');
  });

  it('should successfully return student list with emails for Docentes (with view details permission)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUser.mockResolvedValue({
      id: 'user_docente',
      publicMetadata: { role: 'Docente' },
    });

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

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.list).toHaveLength(2);
    expect(body.list[0].email).toBe('john@example.com'); // Not obfuscated
    expect(body.list[1].email).toBe('jane@example.com');
  });

  it('should successfully obfuscate student emails for students (lacking view details permission)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_estudiante' } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUser.mockResolvedValue({
      id: 'user_estudiante',
      publicMetadata: { role: 'Estudiante' },
    });

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

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.list).toHaveLength(1);
    expect(body.list[0].email).toBe(''); // Obfuscated!
  });

  it('should return 500 if handler or Clerk call throws an error', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetUser.mockRejectedValue(new Error('Clerk API down'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const rawReq = new Request('http://localhost/api/student/list');
    const req = new NextRequest(rawReq);

    const res = await GET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Ocurrió un error al procesar la solicitud');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
