-- Add top_genres_2w column to steam_user_stats table
ALTER TABLE steam_user_stats
ADD COLUMN IF NOT EXISTS top_genres_2w TEXT[] DEFAULT '{}'::text[];

