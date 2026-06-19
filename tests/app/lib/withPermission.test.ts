import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { withPermission } from '../../../app/lib/withPermission';
import { NextRequest, NextResponse } from 'next/server';
import { PERMISSION } from '../../../domain/identity/permissions';

const mockAuth = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock('@clerk/nextjs/server', () => {
  return {
    auth: () => mockAuth(),
    currentUser: () => mockCurrentUser(),
  };
});

describe('withPermission middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error in tests for cleaner output when testing error handling
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return 401 if user is not authenticated (no userId)', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      getToken: vi.fn().mockResolvedValue(null),
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrappedHandler = withPermission(PERMISSION.HOME_CHAT, handler);

    const req = new NextRequest('http://localhost/api/test');
    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('No autorizado');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 if user has no role metadata', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      getToken: vi.fn().mockResolvedValue('token_abc'),
    });
    mockCurrentUser.mockResolvedValue({
      id: 'user_123',
      publicMetadata: {},
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    });

    const handler = vi.fn();
    const wrappedHandler = withPermission(PERMISSION.HOME_CHAT, handler);

    const req = new NextRequest('http://localhost/api/test');
    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('No tenés permiso');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 if role does not have permission', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      getToken: vi.fn().mockResolvedValue('token_abc'),
    });
    // Estudiante has HOME_CHAT and STUDENTS_LIST, but not STUDENT_DEACTIVATE
    mockCurrentUser.mockResolvedValue({
      id: 'user_123',
      publicMetadata: { role: 'Estudiante' },
      emailAddresses: [{ emailAddress: 'student@example.com' }],
    });

    const handler = vi.fn();
    const wrappedHandler = withPermission(PERMISSION.STUDENT_DEACTIVATE, handler);

    const req = new NextRequest('http://localhost/api/test');
    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should deny STUDENT_DEACTIVATE for Auxiliar docente even if they normalize to admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_aux',
      getToken: vi.fn().mockResolvedValue('token_abc'),
    });
    // Auxiliar docente maps to admin, which has deactivate permission, but has explicit override
    mockCurrentUser.mockResolvedValue({
      id: 'user_aux',
      publicMetadata: { role: 'Auxiliar docente' },
      emailAddresses: [{ emailAddress: 'aux@example.com' }],
    });

    const handler = vi.fn();
    const wrappedHandler = withPermission(PERMISSION.STUDENT_DEACTIVATE, handler);

    const req = new NextRequest('http://localhost/api/test');
    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should call handler successfully for Docente (which maps to admin) requesting STUDENT_DEACTIVATE', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('token_abc');
    mockAuth.mockResolvedValue({
      userId: 'user_docente',
      getToken: mockGetToken,
    });
    mockCurrentUser.mockResolvedValue({
      id: 'user_docente',
      publicMetadata: { role: 'Docente' },
      emailAddresses: [{ emailAddress: 'docente@example.com' }],
    });

    const handlerResponse = NextResponse.json({ ok: true });
    const handler = vi.fn().mockResolvedValue(handlerResponse);
    const wrappedHandler = withPermission(PERMISSION.STUDENT_DEACTIVATE, handler);

    const req = new NextRequest('http://localhost/api/test');
    const context = { params: { id: '123' } };
    const res = await wrappedHandler(req, context);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      req,
      {
        userId: 'user_docente',
        role: 'admin',
        email: 'docente@example.com',
        jwt: 'token_abc',
      },
      context
    );
  });

  it('should return 500 when an unexpected exception is thrown', async () => {
    mockAuth.mockRejectedValue(new Error('Clerk offline'));

    const handler = vi.fn();
    const wrappedHandler = withPermission(PERMISSION.HOME_CHAT, handler);

    const req = new NextRequest('http://localhost/api/test');
    const res = await wrappedHandler(req, {});

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Ocurrió un error');
    expect(handler).not.toHaveBeenCalled();
  });
});
