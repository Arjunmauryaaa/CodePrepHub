-- Drop all problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view group members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view activities of their groups" ON public.activities;
DROP POLICY IF EXISTS "Anyone can view groups they are member of" ON public.groups;
DROP POLICY IF EXISTS "Users can view profiles of group members" ON public.profiles;
DROP POLICY IF EXISTS "Group members can view group programs" ON public.programs;
DROP POLICY IF EXISTS "Group members can create group programs" ON public.programs;
DROP POLICY IF EXISTS "Group members can update group programs" ON public.programs;

-- Create security definer function to check group membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Create function to get user's group IDs
CREATE OR REPLACE FUNCTION public.get_user_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id
$$;

-- Recreate group_members policy using simple auth.uid() check (no recursion)
CREATE POLICY "Users can view their own memberships"
ON public.group_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view other members of same groups"
ON public.group_members
FOR SELECT
USING (group_id IN (SELECT public.get_user_group_ids(auth.uid())));

-- Recreate activities policy
CREATE POLICY "Users can view activities of their groups"
ON public.activities
FOR SELECT
USING (
  user_id = auth.uid() 
  OR group_id IN (SELECT public.get_user_group_ids(auth.uid()))
);

-- Recreate groups policy
CREATE POLICY "Anyone can view groups they are member of"
ON public.groups
FOR SELECT
USING (
  id IN (SELECT public.get_user_group_ids(auth.uid()))
  OR created_by = auth.uid()
);

-- Recreate profiles policy for viewing group members
CREATE POLICY "Users can view profiles of group members"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT gm.user_id FROM public.group_members gm
    WHERE gm.group_id IN (SELECT public.get_user_group_ids(auth.uid()))
  )
);

-- Recreate programs policies for group programs
CREATE POLICY "Group members can view group programs"
ON public.programs
FOR SELECT
USING (
  is_group_program = true 
  AND public.is_group_member(auth.uid(), group_id)
);

CREATE POLICY "Group members can create group programs"
ON public.programs
FOR INSERT
WITH CHECK (
  is_group_program = true 
  AND public.is_group_member(auth.uid(), group_id)
);

CREATE POLICY "Group members can update group programs"
ON public.programs
FOR UPDATE
USING (
  is_group_program = true 
  AND public.is_group_member(auth.uid(), group_id)
);