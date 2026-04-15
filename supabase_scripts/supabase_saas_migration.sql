-- ==========================================
-- SCRIPT DE CRÉATION COMPLÈTE DE LA BASE DE DONNÉES (POUR PROJET DEV VIDE)
-- ==========================================

-- 1. Nettoyage initial (au cas où il y ait des éléments restants)
DROP TABLE IF EXISTS public.weekly_schedules CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.vehicle_inspections CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.team_mood CASCADE;
DROP TABLE IF EXISTS public.pre_meeting_notes CASCADE;
DROP TABLE IF EXISTS public.consumable_requests CASCADE;
DROP TABLE IF EXISTS public.agenda_items CASCADE;
DROP TABLE IF EXISTS public.action_items CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.colleagues CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.inspection_status CASCADE;
DROP TYPE IF EXISTS public.action_status CASCADE;
DROP TYPE IF EXISTS public.agenda_item_status CASCADE;

-- 2. Types & Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.inspection_status AS ENUM ('pending', 'completed', 'overdue', 'failed_reinspection');
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.agenda_item_status AS ENUM ('pending', 'in_progress', 'discussed', 'skipped');

-- 3. Tables Fondations SaaS
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role public.app_role DEFAULT 'employee'::public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, organization_id)
);

-- 4. Tables Métiers (Toutes liées à organization_id)
CREATE TABLE public.colleagues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  post TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  colleagues_ids UUID[],
  successes TEXT[] DEFAULT '{}',
  failures TEXT[] DEFAULT '{}',
  sensitive_points TEXT[] DEFAULT '{}',
  relational_points TEXT[] DEFAULT '{}',
  sse TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}'
);

CREATE TABLE public.action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  assigned_to_colleague_id UUID REFERENCES public.colleagues(id),
  due_date TEXT,
  status public.action_status DEFAULT 'pending'::public.action_status,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE
);

CREATE TABLE public.agenda_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_duration_minutes INTEGER,
  responsible_colleague_id UUID REFERENCES public.colleagues(id),
  "order" INTEGER NOT NULL,
  status public.agenda_item_status DEFAULT 'pending'::public.agenda_item_status,
  notes TEXT
);

CREATE TABLE public.consumable_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  item_name TEXT NOT NULL,
  details TEXT,
  quantity INTEGER NOT NULL,
  requested_by_colleague_id UUID REFERENCES public.colleagues(id),
  status TEXT NOT NULL
);

CREATE TABLE public.pre_meeting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  for_meeting_date TEXT,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE public.team_mood (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  mood_score INTEGER NOT NULL,
  comment TEXT
);

CREATE TABLE public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  make TEXT,
  model TEXT,
  license_plate TEXT,
  year INTEGER,
  current_mileage INTEGER
);

CREATE TABLE public.vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  inspection_type TEXT NOT NULL,
  due_date TEXT NOT NULL,
  last_inspection_date TEXT,
  status public.inspection_status DEFAULT 'pending'::public.inspection_status,
  notes TEXT,
  recurrence_interval_value INTEGER,
  recurrence_interval_unit TEXT,
  reinspection_required BOOLEAN DEFAULT FALSE,
  reinspection_due_date TEXT
);

CREATE TABLE public.leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  colleague_id UUID REFERENCES public.colleagues(id),
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration_hours REAL,
  notes TEXT,
  status TEXT NOT NULL
);

CREATE TABLE public.weekly_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  week_start_date TEXT NOT NULL,
  in_charge_colleague_id UUID REFERENCES public.colleagues(id),
  notes TEXT
);

-- Note: Ce script crée d'abord toute ton application depuis zéro, y compris l'architecture SaaS.
-- Il écrasera toutes les données (ce qui est voulu pour ton espace DEV).
