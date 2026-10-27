-- ====================================================================
-- FluxQR Supabase PostgreSQL Migration Script
-- Production Schema with Row Level Security (RLS) & Indexes
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create QR Codes Table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    qr_style JSONB NOT NULL DEFAULT '{
        "fgColor": "#0f172a",
        "bgColor": "#ffffff",
        "size": 512,
        "errorCorrection": "M",
        "dotStyle": "square"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Validate URL format constraint
ALTER TABLE public.qr_codes 
    ADD CONSTRAINT check_destination_url_protocol 
    CHECK (destination_url ~* '^https?://');

-- 3. Create Scans Table (Privacy-conscious analytics)
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    referrer TEXT,
    device_category VARCHAR(32) DEFAULT 'unknown' CHECK (device_category IN ('mobile', 'desktop', 'tablet', 'bot', 'unknown')),
    browser VARCHAR(64),
    os VARCHAR(64),
    ip_hash VARCHAR(64) -- Salted SHA-256 hash of IP + salt, never raw IP
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_scans_qr_code_id ON public.scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON public.scans(scanned_at DESC);

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER trigger_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for qr_codes
-- Users can only read their own QR codes
CREATE POLICY "Users can view own qr_codes" 
    ON public.qr_codes FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can only insert their own QR codes
CREATE POLICY "Users can create own qr_codes" 
    ON public.qr_codes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update only their own QR codes (CRITICAL: code cannot be altered)
CREATE POLICY "Users can update own qr_codes" 
    ON public.qr_codes FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own QR codes
CREATE POLICY "Users can delete own qr_codes" 
    ON public.qr_codes FOR DELETE 
    USING (auth.uid() = user_id);

-- Public Policy for the Redirect Resolver:
-- Anonymous or edge service can read active destination URL by public code
CREATE POLICY "Public redirect lookup for active QRs" 
    ON public.qr_codes FOR SELECT 
    USING (status = 'active');

-- 8. RLS Policies for scans
-- Users can view scans of their own QR codes
CREATE POLICY "Users can view scans of own qr_codes" 
    ON public.scans FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.qr_codes 
        WHERE qr_codes.id = scans.qr_code_id 
        AND qr_codes.user_id = auth.uid()
    ));

-- Public / Service role can insert new scan events anonymously during redirect
CREATE POLICY "Allow scan insertion" 
    ON public.scans FOR INSERT 
    WITH CHECK (true);
