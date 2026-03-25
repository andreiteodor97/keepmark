-- Full-text search setup for items table
-- Run after Prisma migrations

ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN(search_vector);

CREATE OR REPLACE FUNCTION items_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.url, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_search_trigger ON items;
CREATE TRIGGER items_search_trigger
  BEFORE INSERT OR UPDATE OF title, url, notes ON items
  FOR EACH ROW EXECUTE FUNCTION items_search_update();

-- Backfill existing items
UPDATE items SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(url, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(notes, '')), 'C');
