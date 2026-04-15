-- ==========================================
-- SCRIPT D'ACTIVATION DU RLS (Row Level Security) POUR MULTI-TENANT
-- ==========================================

-- 1. Fonction utilitaire pour récupérer les organisations de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE (org_id UUID, user_role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id, role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 2. Activation de RLS sur toutes les tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_mood ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Ajout d'une éventuelle table manquante
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_balances') THEN
    ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Politiques pour `organizations`
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations FOR SELECT USING (id IN (SELECT org_id FROM public.get_user_organizations()) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
CREATE POLICY "organizations_insert" ON public.organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;
CREATE POLICY "organizations_delete" ON public.organizations FOR DELETE USING (owner_id = auth.uid());

-- 4. Politiques pour `user_roles`
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_organizations()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT org_id FROM public.get_user_organizations() WHERE user_role = 'admin'));

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_organizations() WHERE user_role = 'admin'));

DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_organizations() WHERE user_role = 'admin'));

-- 5. Politiques macro pour toutes les tables utilisant `organization_id`
-- colleagues
DROP POLICY IF EXISTS "colleagues_all" ON public.colleagues;
CREATE POLICY "colleagues_all" ON public.colleagues FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- meetings
DROP POLICY IF EXISTS "meetings_all" ON public.meetings;
CREATE POLICY "meetings_all" ON public.meetings FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- action_items
DROP POLICY IF EXISTS "action_items_all" ON public.action_items;
CREATE POLICY "action_items_all" ON public.action_items FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- consumable_requests
DROP POLICY IF EXISTS "consumable_requests_all" ON public.consumable_requests;
CREATE POLICY "consumable_requests_all" ON public.consumable_requests FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- pre_meeting_notes
DROP POLICY IF EXISTS "pre_meeting_notes_all" ON public.pre_meeting_notes;
CREATE POLICY "pre_meeting_notes_all" ON public.pre_meeting_notes FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- team_mood
DROP POLICY IF EXISTS "team_mood_all" ON public.team_mood;
CREATE POLICY "team_mood_all" ON public.team_mood FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- vehicles
DROP POLICY IF EXISTS "vehicles_all" ON public.vehicles;
CREATE POLICY "vehicles_all" ON public.vehicles FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- leave_requests
DROP POLICY IF EXISTS "leave_requests_all" ON public.leave_requests;
CREATE POLICY "leave_requests_all" ON public.leave_requests FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- weekly_schedules
DROP POLICY IF EXISTS "weekly_schedules_all" ON public.weekly_schedules;
CREATE POLICY "weekly_schedules_all" ON public.weekly_schedules FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));

-- leave_balances (si elle existe)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_balances') THEN
    EXECUTE 'DROP POLICY IF EXISTS "leave_balances_all" ON public.leave_balances; CREATE POLICY "leave_balances_all" ON public.leave_balances FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_organizations())) WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_organizations()));';
  END IF;
END $$;

-- 6. Politiques pour les tables sans `organization_id`
-- agenda_items (lié à meeting_id)
DROP POLICY IF EXISTS "agenda_items_all" ON public.agenda_items;
CREATE POLICY "agenda_items_all" ON public.agenda_items FOR ALL 
USING (meeting_id IN (SELECT id FROM public.meetings WHERE organization_id IN (SELECT org_id FROM public.get_user_organizations()))) 
WITH CHECK (meeting_id IN (SELECT id FROM public.meetings WHERE organization_id IN (SELECT org_id FROM public.get_user_organizations())));

-- vehicle_inspections (lié à vehicle_id)
DROP POLICY IF EXISTS "vehicle_inspections_all" ON public.vehicle_inspections;
CREATE POLICY "vehicle_inspections_all" ON public.vehicle_inspections FOR ALL 
USING (vehicle_id IN (SELECT id FROM public.vehicles WHERE organization_id IN (SELECT org_id FROM public.get_user_organizations()))) 
WITH CHECK (vehicle_id IN (SELECT id FROM public.vehicles WHERE organization_id IN (SELECT org_id FROM public.get_user_organizations())));

-- FIN DU SCRIPT
