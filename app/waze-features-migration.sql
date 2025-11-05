-- =============================================
-- Waze-Style Features: Hazard Reporting & Notifications
-- =============================================

-- 1. Create hazard_reports table
CREATE TABLE IF NOT EXISTS public.hazard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  hazard_type TEXT NOT NULL, -- 'police', 'accident', 'hazard', 'traffic', 'road_closed'
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_active BOOLEAN DEFAULT true,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours'), -- Auto-expire after 2 hours
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create arrival_notifications table
CREATE TABLE IF NOT EXISTS public.arrival_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination_latitude DOUBLE PRECISION NOT NULL,
  destination_longitude DOUBLE PRECISION NOT NULL,
  arrived_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for hazard_reports
CREATE POLICY "hazard_reports_select"
  ON public.hazard_reports FOR SELECT
  USING (true); -- Allow viewing all active hazards

CREATE POLICY "hazard_reports_insert"
  ON public.hazard_reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "hazard_reports_update"
  ON public.hazard_reports FOR UPDATE
  USING (auth.uid() = reported_by)
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "hazard_reports_delete"
  ON public.hazard_reports FOR DELETE
  USING (auth.uid() = reported_by);

-- 5. RLS Policies for arrival_notifications
CREATE POLICY "arrival_notifications_select"
  ON public.arrival_notifications FOR SELECT
  USING (true);

CREATE POLICY "arrival_notifications_insert"
  ON public.arrival_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "arrival_notifications_update"
  ON public.arrival_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS hazard_reports_party_id_idx ON public.hazard_reports(party_id);
CREATE INDEX IF NOT EXISTS hazard_reports_location_idx ON public.hazard_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS hazard_reports_expires_at_idx ON public.hazard_reports(expires_at);
CREATE INDEX IF NOT EXISTS arrival_notifications_party_id_idx ON public.arrival_notifications(party_id);

-- 7. Auto-delete expired hazards function
CREATE OR REPLACE FUNCTION public.cleanup_expired_hazards()
RETURNS void AS $$
BEGIN
  DELETE FROM public.hazard_reports
  WHERE expires_at < NOW() OR is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.hazard_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.arrival_notifications;

-- 9. Verify
SELECT 'Tables Created' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('hazard_reports', 'arrival_notifications');
