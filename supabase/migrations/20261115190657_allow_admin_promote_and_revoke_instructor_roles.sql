CREATE POLICY "Admins promote members to instructor admins" ON public.rls_user_roles
 FOR UPDATE TO authenticated USING ((SELECT private.rls_is_admin()) AND role::text='member')
 WITH CHECK ((SELECT private.rls_is_admin()) AND role::text='instructor_admin');
CREATE POLICY "Admins revoke instructor admin role" ON public.rls_user_roles
 FOR UPDATE TO authenticated USING ((SELECT private.rls_is_admin()) AND role::text='instructor_admin')
 WITH CHECK ((SELECT private.rls_is_admin()) AND role::text='member');