-- Agregar columna dni_encrypted a la tabla public.users si no existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dni_encrypted BYTEA;

-- Inicializar registros existentes con DNIs aleatorios encriptados
-- Clave de encriptación por defecto en desarrollo: a8a3fc5a841019d3098f8afb5e23eb67289868a7df9ed7825bf77a437c5ee3f2
DO $$
DECLARE
    encryption_key TEXT := 'a8a3fc5a841019d3098f8afb5e23eb67289868a7df9ed7825bf77a437c5ee3f2';
    user_record RECORD;
    random_dni TEXT;
BEGIN
    FOR user_record IN 
        SELECT id FROM public.users WHERE role IN ('Estudiante', 'Alumno', 'estudiante', 'alumno') AND dni_encrypted IS NULL
    LOOP
        random_dni := (10000000 + floor(random() * 89999999))::text;
        UPDATE public.users
        SET dni_encrypted = extensions.pgp_sym_encrypt(random_dni, encryption_key)
        WHERE id = user_record.id;
    END LOOP;
END $$;
