import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ensureUserSynced } from '../../../app/actions/sync-user';
import pool from '../../../lib/db';

const mockGetUser = vi.fn();
const mockUpdateUserMetadata = vi.fn();

vi.mock('@clerk/nextjs/server', () => {
  return {
    clerkClient: () =>
      Promise.resolve({
        users: {
          getUser: mockGetUser,
          updateUserMetadata: mockUpdateUserMetadata,
        },
      }),
  };
});

vi.mock('../../../lib/db', () => {
  return {
    default: {
      query: vi.fn(),
    },
    getEncryptionKey: vi.fn(() => 'mock-encryption-key'),
  };
});

describe('ensureUserSynced server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if the user already exists in the database', async () => {
    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery.mockResolvedValue({
      rowCount: 1, // User exists
      rows: [{ id: 'some-uuid', role: 'Estudiante' }],
    });

    await ensureUserSynced('user_already_exists');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT id, role FROM public.users');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should sync user and set default role in Clerk if they do not have a role', async () => {
    // 1st query: Check if user exists -> returns 0 rows
    // 2nd query: Insert user
    const mockQuery = vi.mocked(pool.query) as Mock;
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    mockGetUser.mockResolvedValue({
      id: 'user_new',
      firstName: 'Jane',
      lastName: 'Smith',
      emailAddresses: [{ emailAddress: 'jane.smith@example.com' }],
      publicMetadata: {}, // no role
    });

    await ensureUserSynced('user_new');

    expect(mockGetUser).toHaveBeenCalledWith('user_new');
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_new', {
      publicMetadata: { role: 'Estudiante' },
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO public.users');
    expect(insertCall[1]).toEqual([
      'user_new',
      'Jane',
      'Smith',
      'jane.smith@example.com',
      'Estudiante',
      'mock-encryption-key',
    ]);
  });

  it('should sync user without updating Clerk metadata if role already exists', async () => {
    (vi.mocked(pool.query) as Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    mockGetUser.mockResolvedValue({
      id: 'user_docente',
      firstName: 'Professor',
      lastName: 'X',
      emailAddresses: [{ emailAddress: 'prof.x@example.com' }],
      publicMetadata: { role: 'Docente' },
    });

    await ensureUserSynced('user_docente');

    expect(mockGetUser).toHaveBeenCalledWith('user_docente');
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled(); // Role is already set

    const insertCall = vi.mocked(pool.query).mock.calls[1];
    expect(insertCall[1]).toEqual([
      'user_docente',
      'Professor',
      'X',
      'prof.x@example.com',
      'Docente',
      'mock-encryption-key',
    ]);
  });

  it('should abort sync and log warning if user has no email', async () => {
    (vi.mocked(pool.query) as Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    mockGetUser.mockResolvedValue({
      id: 'user_no_email',
      firstName: 'No',
      lastName: 'Email',
      emailAddresses: [],
      publicMetadata: {},
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await ensureUserSynced('user_no_email');

    expect(mockGetUser).toHaveBeenCalledWith('user_no_email');
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1); // Only check query ran, insert did not
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('no tiene un correo electrónico'));
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('Database error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ensureUserSynced('user_error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error al sincronizar el usuario'), expect.any(Error));
  });
});
