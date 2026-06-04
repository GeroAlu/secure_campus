-- Habilitar Row Level Security en la tabla public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar la política si ya existe para evitar conflictos
DROP POLICY IF EXISTS "role_based_select" ON public.users;

-- Crear la política de selección basada en rol o hash de email
CREATE POLICY "role_based_select"
ON public.users
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    OR email_hash = encode(digest((auth.jwt() ->> 'email')::text, 'sha256'), 'hex')
);
