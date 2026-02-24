-- Add stripe_customer_id column to profiles table for reliable subscription lookups.
-- Run this in the Supabase SQL editor.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
ON public.profiles (stripe_customer_id);
