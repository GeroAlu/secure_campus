-- Decrypt email column in public.users and change type to VARCHAR(255)
-- The development/default encryption key is: a8a3fc5a841019d3098f8afb5e23eb67289868a7df9ed7825bf77a437c5ee3f2

DO $$
DECLARE
    encryption_key TEXT := 'a8a3fc5a841019d3098f8afb5e23eb67289868a7df9ed7825bf77a437c5ee3f2';
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email';

    IF col_type = 'bytea' THEN
        RAISE NOTICE 'Converting email column from BYTEA to VARCHAR(255) and decrypting values...';
        
        -- Decrypt the column and change type to VARCHAR(255)
        ALTER TABLE public.users ALTER COLUMN email TYPE VARCHAR(255)
            USING extensions.pgp_sym_decrypt(email, encryption_key);
            
        RAISE NOTICE 'Email column converted successfully.';
    ELSE
        RAISE NOTICE 'Email column is already of type %', col_type;
    END IF;
END $$;
