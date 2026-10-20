-- RideX Cab Booking Platform Database Schema Migration
-- Compatible with Supabase Auth (auth.users), PostgreSQL and Row Level Security (RLS)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. PROFILES (Users linked to Supabase Auth auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT 'User',
    phone VARCHAR(32),
    avatar_url TEXT,
    role VARCHAR(32) NOT NULL DEFAULT 'customer' CHECK (role IN ('rider', 'driver', 'customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Automatic Profile Creation Trigger on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'phone',
        COALESCE(new.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 2. DRIVER PROFILES (Vehicle and verification details)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    license_number VARCHAR(64) NOT NULL UNIQUE,
    vehicle_make VARCHAR(64) NOT NULL,
    vehicle_model VARCHAR(64) NOT NULL,
    vehicle_color VARCHAR(32) NOT NULL,
    vehicle_plate VARCHAR(32) NOT NULL UNIQUE,
    ride_category VARCHAR(32) NOT NULL DEFAULT 'go' CHECK (ride_category IN ('go', 'comfort', 'xl', 'black')),
    approval_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    total_rides INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_availability ON public.driver_profiles(is_available, approval_status, ride_category);

-- ====================================================================
-- 3. DRIVER LOCATIONS (Real-time telemetry and geocoding)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.driver_locations (
    driver_id UUID PRIMARY KEY REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_coords ON public.driver_locations(latitude, longitude);

-- ====================================================================
-- 4. RIDES (Core ride booking entity)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    
    -- Pickup Details
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,

    -- Drop-off Details
    dropoff_address TEXT NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,

    -- Multi-stops (JSON array of { address, lat, lng })
    stops JSONB DEFAULT '[]'::jsonb,

    ride_category VARCHAR(32) NOT NULL CHECK (ride_category IN ('go', 'comfort', 'xl', 'black')),
    distance_km NUMERIC(6, 2) NOT NULL,
    duration_mins INTEGER NOT NULL,
    
    fare_estimate NUMERIC(8, 2) NOT NULL,
    final_fare NUMERIC(8, 2),
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',

    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED' 
        CHECK (status IN ('REQUESTED', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id),
    otp VARCHAR(6),

    accepted_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_rider ON public.rides(rider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);

-- ====================================================================
-- 5. PAYMENTS (Stripe transaction records)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(8, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    payment_method VARCHAR(32) NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card', 'upi', 'cash', 'wallet')),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret TEXT,
    idempotency_key VARCHAR(128) UNIQUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_ride ON public.payments(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON public.payments(stripe_payment_intent_id);

-- ====================================================================
-- 6. RIDE REVIEWS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ride_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE UNIQUE,
    rider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_reviews_driver ON public.ride_reviews(driver_id);

-- ====================================================================
-- 7. SAVED PLACES (Home, Work, Custom locations)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.saved_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label VARCHAR(64) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, label)
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);

-- ====================================================================
-- 8. PROMO CODES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
    discount_value NUMERIC(6, 2) NOT NULL,
    max_discount NUMERIC(6, 2),
    min_order_value NUMERIC(6, 2) DEFAULT 0.00,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER DEFAULT 1000,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 9. SUPPORT TICKETS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);

-- ====================================================================
-- 10. NOTIFICATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES USING auth.uid()
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR role = 'admin');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Saved Places Policies
DROP POLICY IF EXISTS "Users view own saved places" ON public.saved_places;
CREATE POLICY "Users view own saved places" ON public.saved_places
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own saved places" ON public.saved_places;
CREATE POLICY "Users insert own saved places" ON public.saved_places
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own saved places" ON public.saved_places;
CREATE POLICY "Users delete own saved places" ON public.saved_places
    FOR DELETE USING (user_id = auth.uid());

-- Rides Policies
DROP POLICY IF EXISTS "Riders and drivers view their rides" ON public.rides;
CREATE POLICY "Riders and drivers view their rides" ON public.rides
    FOR SELECT USING (
        rider_id = auth.uid() 
        OR driver_id IN (SELECT id FROM public.driver_profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Riders can insert ride requests" ON public.rides;
CREATE POLICY "Riders can insert ride requests" ON public.rides
    FOR INSERT WITH CHECK (rider_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());
