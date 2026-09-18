-- Migration: 202609180002_income_head_master.sql
-- Description: Create income_head_master table for income categories and types, and enhance income_master

CREATE TABLE IF NOT EXISTS public.income_head_master (
    head_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    head_category VARCHAR(100) NOT NULL DEFAULT 'Fee Income',
    head_name VARCHAR(150) NOT NULL,
    head_code VARCHAR(50),
    default_amount NUMERIC(12, 2) DEFAULT 0.00,
    frequency VARCHAR(50) DEFAULT 'As Needed',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissive policies
ALTER TABLE public.income_head_master ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'income_head_master' AND policyname = 'Allow all access to income_head_master'
    ) THEN
        CREATE POLICY "Allow all access to income_head_master" ON public.income_head_master
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enhance income_master with income_category and head linkage
ALTER TABLE public.income_master ADD COLUMN IF NOT EXISTS income_category VARCHAR(100) DEFAULT 'Fee Income';
ALTER TABLE public.income_master ADD COLUMN IF NOT EXISTS head_id UUID REFERENCES public.income_head_master(head_id) ON DELETE SET NULL;
ALTER TABLE public.income_master ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) DEFAULT '2026-27';

-- Seed initial preset income heads if empty
INSERT INTO public.income_head_master (head_category, head_name, head_code, default_amount, frequency, description)
SELECT c.head_category, c.head_name, c.head_code, c.default_amount, c.frequency, c.head_name || ' (' || c.head_category || ')'
FROM (
    VALUES 
        -- Fee Income
        ('Fee Income', 'Examination Fee', 'INC-FEE-EXAM', 500.00, 'As Needed'),
        ('Fee Income', 'Computer Fee', 'INC-FEE-COMP', 300.00, 'Monthly'),
        ('Fee Income', 'Smart Class Fee', 'INC-FEE-SMART', 250.00, 'Monthly'),
        ('Fee Income', 'Activity Fee', 'INC-FEE-ACT', 200.00, 'Quarterly'),
        ('Fee Income', 'Sports Fee', 'INC-FEE-SPORT', 350.00, 'Annual'),
        ('Fee Income', 'Cultural Activity Fee', 'INC-FEE-CULT', 250.00, 'Annual'),
        ('Fee Income', 'Annual Function Fee', 'INC-FEE-ANN', 600.00, 'Annual'),
        ('Fee Income', 'Magazine Fee', 'INC-FEE-MAG', 150.00, 'Annual'),
        ('Fee Income', 'Identity Card Fee', 'INC-FEE-ID', 100.00, 'One-time'),
        ('Fee Income', 'School Diary Fee', 'INC-FEE-DIARY', 120.00, 'Annual'),
        ('Fee Income', 'Transfer Certificate Fee', 'INC-FEE-TC', 250.00, 'One-time'),
        ('Fee Income', 'Migration Certificate Fee', 'INC-FEE-MIG', 300.00, 'One-time'),
        ('Fee Income', 'Re-admission Fee', 'INC-FEE-READM', 1000.00, 'One-time'),
        ('Fee Income', 'Late Fee', 'INC-FEE-LATE', 50.00, 'As Needed'),
        ('Fee Income', 'Fine and Penalty', 'INC-FEE-FINE', 100.00, 'As Needed'),
        ('Fee Income', 'Miscellaneous Student Charges', 'INC-FEE-MISC', 150.00, 'As Needed'),

        -- Uniform and Educational Materials
        ('Uniform and Educational Materials', 'School Uniform Sales', 'INC-MAT-UNIF', 850.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Sports Uniform Sales', 'INC-MAT-SPUNIF', 650.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Socks Sales', 'INC-MAT-SOCKS', 80.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Books Sales', 'INC-MAT-BOOKS', 1800.00, 'Annual'),
        ('Uniform and Educational Materials', 'Notebooks Sales', 'INC-MAT-NOTES', 500.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Stationery Sales', 'INC-MAT-STAT', 250.00, 'As Needed'),
        ('Uniform and Educational Materials', 'School Bag Sales', 'INC-MAT-BAG', 450.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Belt', 'INC-MAT-BELT', 90.00, 'As Needed'),
        ('Uniform and Educational Materials', 'Art and Craft Materials', 'INC-MAT-CRAFT', 300.00, 'As Needed'),

        -- Extra-Curricular Income
        ('Extra-Curricular Income', 'Coaching Class Fee', 'INC-EXT-COACH', 1200.00, 'Monthly'),
        ('Extra-Curricular Income', 'Music Class Fee', 'INC-EXT-MUSIC', 400.00, 'Monthly'),
        ('Extra-Curricular Income', 'Dance Class Fee', 'INC-EXT-DANCE', 400.00, 'Monthly'),
        ('Extra-Curricular Income', 'Drawing Class Fee', 'INC-EXT-DRAW', 350.00, 'Monthly'),
        ('Extra-Curricular Income', 'Computer Training Fee', 'INC-EXT-COMPTRN', 600.00, 'Monthly'),
        ('Extra-Curricular Income', 'Spoken English Fee', 'INC-EXT-ENG', 500.00, 'Monthly'),
        ('Extra-Curricular Income', 'Abacus Class Fee', 'INC-EXT-ABACUS', 550.00, 'Monthly'),
        ('Extra-Curricular Income', 'Yoga Class Fee', 'INC-EXT-YOGA', 300.00, 'Monthly'),
        ('Extra-Curricular Income', 'Martial Arts Fee', 'INC-EXT-MARTIAL', 450.00, 'Monthly'),
        ('Extra-Curricular Income', 'Swimming Fee', 'INC-EXT-SWIM', 800.00, 'Monthly'),
        ('Extra-Curricular Income', 'Summer Camp Fee', 'INC-EXT-CAMP', 1500.00, 'One-time'),
        ('Extra-Curricular Income', 'Educational Tour Fee', 'INC-EXT-TOUR', 2000.00, 'One-time'),
        ('Extra-Curricular Income', 'Excursion Fee', 'INC-EXT-EXCUR', 750.00, 'One-time'),
        ('Extra-Curricular Income', 'Competition Fee', 'INC-EXT-COMPETE', 200.00, 'As Needed')
) AS c(head_category, head_name, head_code, default_amount, frequency)
WHERE NOT EXISTS (SELECT 1 FROM public.income_head_master);
