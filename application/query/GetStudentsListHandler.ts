import pool from '../../lib/db';

export class GetStudentsListHandler {

    async handle(command: GetStudentsListQuery): Promise<GetStudentsListResponse> {
        let students: Student[] = [];
        let totalItems = 0;
        
        const page = command.page || 1;
        const limit = command.limit || 10;
        const offset = (page - 1) * limit;

        try {
            // Count total students (Estudiante or Alumno)
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM public.users WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno')`
            );
            totalItems = parseInt(countResult.rows[0].count, 10);

            // Fetch paginated students
            const usersResult = await pool.query(
                `SELECT * FROM public.users 
                 WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno')
                 ORDER BY created_at DESC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            students = usersResult.rows.map((row: any) => ({
                id: row.clerk_id || row.id, // Fallback to uuid if no clerk_id
                name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Sin Nombre',
                email: row.email || '',
                active: row.active,
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
}