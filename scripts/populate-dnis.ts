import 'dotenv/config';
import pool, { getEncryptionKey } from '../lib/db';

async function run() {
    console.log('--- Applying Schema Updates & Populating Fake DNIs ---');
    const key = getEncryptionKey();

    try {
        // 1. Asegurar columnas en public.users
        console.log('Ensuring detail and dni_encrypted columns exist...');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS detail TEXT NULL');
        await pool.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dni_encrypted BYTEA');

        // 2. Poblar DNIs cifrados aleatorios para usuarios de tipo estudiante
        console.log('Populating fake encrypted DNI values for students...');
        
        // Obtenemos todos los estudiantes que no tengan DNI configurado
        const result = await pool.query(
            `SELECT id FROM public.users 
             WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno') 
               AND dni_encrypted IS NULL`
        );

        const students = result.rows;
        console.log(`Found ${students.length} students without DNI.`);

        let updated = 0;
        for (const student of students) {
            const randomDni = (10000000 + Math.floor(Math.random() * 90000000)).toString();
            
            // Usamos extensions.pgp_sym_encrypt ya que es un entorno Supabase
            await pool.query(
                `UPDATE public.users 
                 SET dni_encrypted = extensions.pgp_sym_encrypt($1::text, $2::text)
                 WHERE id = $3::uuid`,
                [randomDni, key, student.id]
            );
            updated++;
        }

        console.log(`Successfully updated ${updated} students with fake encrypted DNI values.`);
    } catch (error) {
        console.error('Error running updates/population:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
