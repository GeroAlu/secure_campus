-- Agregar columna detail a la tabla public.users si no existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS detail TEXT NULL;
