CREATE OR REPLACE FUNCTION get_full_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT participant_id AS user_id
  FROM (
    SELECT user_1 AS participant_id FROM match_rooms WHERE abandoned_by IS NULL
    UNION ALL
    SELECT user_2 AS participant_id FROM match_rooms WHERE abandoned_by IS NULL
  ) active_participants
  GROUP BY participant_id
  HAVING COUNT(*) >= 3;
$$;

GRANT EXECUTE ON FUNCTION get_full_user_ids() TO authenticated;
