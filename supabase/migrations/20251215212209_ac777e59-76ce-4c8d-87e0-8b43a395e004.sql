-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;

-- Create a security definer function to check if user is admin of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id 
    AND group_id = _group_id 
    AND role = 'admin'
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Group admins can remove members"
ON public.group_members
FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));