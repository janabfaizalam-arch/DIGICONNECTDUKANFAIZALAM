-- Extend homepage_notices table to support rich carousel announcements
ALTER TABLE public.homepage_notices 
ADD COLUMN IF NOT EXISTS notice_type TEXT DEFAULT 'Announcement' CHECK (notice_type IN ('Offer', 'Announcement', 'Update')),
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Migrate existing notice_text to title and short_description for seamless transition
UPDATE public.homepage_notices
SET title = notice_text,
    short_description = notice_text
WHERE title IS NULL;
