-- Update repairs table: verwijder defect_notes kolom
-- Voer deze SQL uit in Supabase SQL Editor

-- Verwijder de defect_notes kolom (data wordt niet bewaard!)
ALTER TABLE repairs DROP COLUMN IF EXISTS defect_notes;

-- De notes kolom wordt nu gebruikt voor alle opmerkingen (inclusief defecten)
