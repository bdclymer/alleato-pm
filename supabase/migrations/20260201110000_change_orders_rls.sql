-- Enable RLS on change_orders table
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view change_orders for projects they belong to
-- Private change orders are only visible to admins (role = 'admin')
CREATE POLICY "change_orders_select_policy" ON change_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = change_orders.project_id
            AND ua.auth_user_id = auth.uid()
        )
        AND (
            NOT is_private
            OR EXISTS (
                SELECT 1 FROM project_directory_memberships pdm
                JOIN people p ON p.id = pdm.person_id
                JOIN users_auth ua ON ua.person_id = p.id
                WHERE pdm.project_id = change_orders.project_id
                AND ua.auth_user_id = auth.uid()
                AND pdm.role IN ('admin', 'Project Admin', 'Project Manager')
            )
        )
    );

-- INSERT: Users can create change_orders for projects they belong to
CREATE POLICY "change_orders_insert_policy" ON change_orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = change_orders.project_id
            AND ua.auth_user_id = auth.uid()
        )
    );

-- UPDATE: Users can update change_orders for projects they belong to
CREATE POLICY "change_orders_update_policy" ON change_orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = change_orders.project_id
            AND ua.auth_user_id = auth.uid()
        )
    );

-- DELETE: Users can delete change_orders for projects they belong to
CREATE POLICY "change_orders_delete_policy" ON change_orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = change_orders.project_id
            AND ua.auth_user_id = auth.uid()
        )
    );
