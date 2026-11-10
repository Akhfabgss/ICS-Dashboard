-- ==============================================================================
-- JALANKAN QUERY INI DI SUPABASE DASHBOARD -> SQL EDITOR LALU KLIK "RUN"
-- ==============================================================================

-- 1. TABEL STATUS MAPPINGS (PEMETAAN STAF SPESIFIK KE STATUS PESANAN OTOMATIS)
CREATE TABLE IF NOT EXISTS status_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  target_status VARCHAR(50) NOT NULL, -- misal: 'Proses Design', 'Pengerjaan', dll.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing untuk pencarian cepat berdasarkan staf
CREATE INDEX IF NOT EXISTS idx_status_mappings_user_id ON status_mappings(user_id);

-- 2. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE status_mappings ENABLE ROW LEVEL SECURITY;

-- Semua user terotentikasi dapat membaca aturan (agar auto-status berjalan saat siapa saja menugaskan staf)
DROP POLICY IF EXISTS "Authenticated users can read status_mappings" ON status_mappings;
CREATE POLICY "Authenticated users can read status_mappings" 
ON status_mappings FOR SELECT 
TO authenticated 
USING (true);

-- Hanya user dengan role 'Owner' yang berhak menambah, mengubah, atau menghapus aturan
DROP POLICY IF EXISTS "Only Owner can manage status_mappings" ON status_mappings;
CREATE POLICY "Only Owner can manage status_mappings" 
ON status_mappings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND LOWER(profiles.role) = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND LOWER(profiles.role) = 'owner'
  )
);
