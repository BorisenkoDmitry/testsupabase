-- Trusted server-side audit access, including archived task history.
-- service_role is never used by the browser. No new client privileges.
grant select on public.task_history to service_role;
