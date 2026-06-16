import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { hasPermission, getUsers, setRole } from '../../../app/actions/roles';
import { auth } from '@clerk/nextjs/server';
import pool from '../../../lib/db';

const mockGetUser = vi.fn();
const mockGetUserList = vi.fn();
const mockUpdateUserMetadata = vi.fn();

vi.mock('@clerk/nextjs/server', () => {
  return {
    auth: vi.fn(),
    clerkClient: () =>
      Promise.resolve({
        users: {
          getUser: mockGetUser,
          getUserList: mockGetUserList,
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

describe('roles actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return false if there is no authenticated userId', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as Awaited<ReturnType<typeof auth>>);
      const result = await hasPermission('view:student_details');
      expect(result).toBe(false);
    });

    it('should return true if the user has the exact permission', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
      (vi.mocked(pool.query) as Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ role: 'Docente' }],
      });

      const result = await hasPermission('deactivate:students');
      expect(result).toBe(true);
    });

    it('should return true if the user has wildcard "*" permission', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as unknown as Awaited<ReturnType<typeof auth>>);
      (vi.mocked(pool.query) as Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ role: 'Administrador' }],
      });

      const result = await hasPermission('any:custom_permission');
      expect(result).toBe(true);
    });

    it('should return false if the user does not have the permission', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_estudiante' } as unknown as Awaited<ReturnType<typeof auth>>);
      (vi.mocked(pool.query) as Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ role: 'Estudiante' }],
      });

      const result = await hasPermission('view:student_details');
      expect(result).toBe(false);
    });
  });

  describe('getUsers', () => {
    it('should fail with Unauthorized error if user lacks manage:roles', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
      (vi.mocked(pool.query) as Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ role: 'Docente' }],
      });

      const users = await getUsers();
      expect(users).toEqual([]);
    });

    it('should fetch users list if user is an Administrator', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as unknown as Awaited<ReturnType<typeof auth>>);
      
      (vi.mocked(pool.query) as Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Administrador' }],
        })
        .mockResolvedValueOnce({
          rowCount: 2,
          rows: [
            { clerk_id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', role: 'Estudiante' },
            { clerk_id: 'u2', first_name: 'Jane', last_name: 'Smith', email: null, role: 'Estudiante' },
          ],
        });

      const users = await getUsers();
      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({
        id: 'u1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Estudiante',
        permissions: [],
      });
      expect(users[1].email).toBe('Sin email');
      expect(users[1].role).toBe('Estudiante');
    });

    it('should return empty list on DB query error', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as unknown as Awaited<ReturnType<typeof auth>>);
      
      (vi.mocked(pool.query) as Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Administrador' }],
        })
        .mockRejectedValueOnce(new Error('Database select error'));

      const users = await getUsers();
      expect(users).toEqual([]);
    });
  });

  describe('setRole', () => {
    it('should reject invalid arguments', async () => {
      const res = await setRole('', '');
      expect(res.success).toBe(false);
    });

    it('should prevent modifying yourself', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as unknown as Awaited<ReturnType<typeof auth>>);
      const res = await setRole('user_admin', 'Docente');
      expect(res.success).toBe(false);
    });

    it('should prevent setting role if not authorized', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_docente' } as unknown as Awaited<ReturnType<typeof auth>>);
      
      (vi.mocked(pool.query) as Mock).mockResolvedValue({
        rowCount: 1,
        rows: [{ role: 'Docente' }],
      });

      const res = await setRole('target_user', 'Administrador');
      expect(res.success).toBe(false);
      expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
    });

    it('should prevent modifying another administrator (manage:roles target)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin_1' } as unknown as Awaited<ReturnType<typeof auth>>);
      
      (vi.mocked(pool.query) as Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Administrador' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Administrador' }],
        });

      const res = await setRole('user_admin_2', 'Estudiante');
      expect(res.success).toBe(false);
      expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
    });

    it('should successfully update role of a lower role user', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_admin' } as unknown as Awaited<ReturnType<typeof auth>>);
      
      (vi.mocked(pool.query) as Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Administrador' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ role: 'Estudiante' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
        });

      mockUpdateUserMetadata.mockResolvedValue({});

      const res = await setRole('user_student', 'Docente');
      expect(res.success).toBe(true);
      expect(mockUpdateUserMetadata).toHaveBeenCalledWith('user_student', {
        publicMetadata: { role: 'Docente' },
      });
    });
  });
});
