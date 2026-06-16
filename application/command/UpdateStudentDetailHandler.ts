import pool from '../../lib/db';
import { updateStudentDetailSchema } from '../../lib/validation';

export class UpdateStudentDetailHandler {
    async handle(command: { studentId: string; detail: string }): Promise<void> {
        const parsed = updateStudentDetailSchema.safeParse(command);
        if (!parsed.success) {
            throw new Error(`Datos inválidos para actualizar detalle: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
        }

        const { studentId, detail } = parsed.data;

        // Soporta búsqueda por id o clerk_id_hash encriptado
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (isUuid) {
            await pool.query(
                `UPDATE public.users SET detail = $1 WHERE id = $2::uuid`,
                [detail, studentId]
            );
        } else {
            await pool.query(
                `UPDATE public.users SET detail = $1 WHERE clerk_id_hash = encode(digest($2::text, 'sha256'), 'hex')`,
                [detail, studentId]
            );
        }
    }
}
