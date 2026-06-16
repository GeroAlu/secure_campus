import pool, { getEncryptionKey } from '../../lib/db';

export class GetStudentDniHandler {
    async handle(query: GetStudentDniQuery): Promise<GetStudentDniResponse> {
        const { studentId } = query;
        const key = getEncryptionKey();

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        
        let result;
        if (isUuid) {
            result = await pool.query(
                `SELECT pgp_sym_decrypt(dni_encrypted, $1::text)::text AS dni 
                 FROM public.users 
                 WHERE id = $2::uuid`,
                [key, studentId]
            );
        } else {
            result = await pool.query(
                `SELECT pgp_sym_decrypt(dni_encrypted, $1::text)::text AS dni 
                 FROM public.users 
                 WHERE clerk_id_hash = encode(digest($2::text, 'sha256'), 'hex')`,
                [key, studentId]
            );
        }

        const dni = result.rows[0]?.dni || null;
        return { dni };
    }
}

export interface GetStudentDniQuery {
    studentId: string;
}

export interface GetStudentDniResponse {
    dni: string | null;
}
