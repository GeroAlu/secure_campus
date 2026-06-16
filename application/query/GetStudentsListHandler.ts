import pool, { getEncryptionKey } from '../../lib/db';
import { paginationSchema } from '../../lib/validation';

interface DBUserRowRaw {
    id: string;
    clerk_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    active: boolean;
    detail?: string | null;
}

export class GetStudentsListHandler {

    async handle(command: GetStudentsListQuery): Promise<GetStudentsListResponse> {
        let students: Student[] = [];
        let totalItems = 0;
        
        const parsed = paginationSchema.safeParse({ page: command.page, limit: command.limit });
        if (!parsed.success) {
            throw new Error(`Invalid pagination: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
        }
        const { page, limit } = parsed.data;
        const offset = (page - 1) * limit;
        const key = getEncryptionKey();

        try {
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM public.users WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno')`
            );
            totalItems = parseInt(countResult.rows[0].count, 10);

            const usersResult = await pool.query<DBUserRowRaw>(
                `SELECT id,
                        pgp_sym_decrypt(clerk_id, $3::text)::text AS clerk_id,
                        first_name,
                        last_name,
                        pgp_sym_decrypt(email, $3::text)::text AS email,
                        active,
                        detail
                 FROM public.users 
                 WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno')
                 ORDER BY created_at DESC
                 LIMIT $1 OFFSET $2`,
                [limit, offset, key]
            );

            students = usersResult.rows.map((row: DBUserRowRaw) => ({
                id: row.clerk_id || row.id,
                name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Sin Nombre',
                email: row.email || '',
                active: row.active,
                detail: row.detail || null,
            }));
        } catch (e) {
            console.error("Error fetching users from Supabase", e);
        }

        const totalPages = Math.max(1, Math.ceil(totalItems / limit));

        return { 
            list: students, 
            totalPages, 
            currentPage: page,
            totalItems
        }
    }
}

export interface GetStudentsListQuery {
    page?: number;
    limit?: number;
}

export interface GetStudentsListResponse {
    list: Student[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
}

export interface Student {
    id: string
    name: string
    email: string
    active: boolean
    detail: string | null
}