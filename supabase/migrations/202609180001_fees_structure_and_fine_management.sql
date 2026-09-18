-- Migration: 202609180001_fees_structure_and_fine_management.sql
-- Description: Create fees_structure table for class-wise fees and enhance fees_collection with fines, waivers, and due month tracking

CREATE TABLE IF NOT EXISTS public.fees_structure (
    fee_struct_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.class_master(class_id) ON DELETE SET NULL,
    class_name VARCHAR(50) NOT NULL,
    fee_type VARCHAR(100) NOT NULL DEFAULT 'Monthly Tuition Fee',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    frequency VARCHAR(50) DEFAULT 'Monthly',
    due_day INT DEFAULT 10,
    academic_year VARCHAR(20) DEFAULT '2026-27',
    description TEXT,
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissive policies for authenticated and anon operations
ALTER TABLE public.fees_structure ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fees_structure' AND policyname = 'Allow all access to fees_structure'
    ) THEN
        CREATE POLICY "Allow all access to fees_structure" ON public.fees_structure
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Alter fees_collection to add enhanced columns
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.class_master(class_id) ON DELETE SET NULL;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS due_month VARCHAR(50);
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fees_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS waive_approved_by_principal BOOLEAN DEFAULT FALSE;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS fine_waive_reason TEXT;
ALTER TABLE public.fees_collection ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);

-- Insert class-wise seed rates if fees_structure is empty
INSERT INTO public.fees_structure (class_name, fee_type, amount, frequency, due_day, academic_year, remarks)
SELECT c.class_name, 'Monthly Tuition Fee', c.amount, 'Monthly', 10, '2026-27', c.class_name || ' Monthly Tuition Fee'
FROM (
    VALUES 
        ('PG', 800.00),
        ('NURSERY', 900.00),
        ('LKG', 1000.00),
        ('UKG', 1000.00),
        ('CLASS I', 1200.00),
        ('CLASS II', 1200.00),
        ('CLASS III', 1300.00),
        ('CLASS IV', 1300.00),
        ('CLASS V', 1400.00),
        ('CLASS VI', 1500.00),
        ('CLASS VII', 1500.00),
        ('CLASS VIII', 1600.00),
        ('CLASS IX', 1800.00),
        ('CLASS X', 2000.00)
) AS c(class_name, amount)
WHERE NOT EXISTS (SELECT 1 FROM public.fees_structure);
