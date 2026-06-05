-- Returns how many active (non-abandoned) chats a user has.
CREATE OR REPLACE FUNCTION get_user_active_chat_count(check_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM match_rooms
  WHERE abandoned_by IS NULL
    AND (user_1 = check_user_id OR user_2 = check_user_id);
$$;

GRANT EXECUTE ON FUNCTION get_user_active_chat_count(uuid) TO authenticated;

-- Block new match_rooms when either participant already has 3 active chats.
CREATE OR REPLACE FUNCTION enforce_match_room_chat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user1_count integer;
  user2_count integer;
BEGIN
  SELECT COUNT(*) INTO user1_count
  FROM match_rooms
  WHERE abandoned_by IS NULL
    AND (user_1 = NEW.user_1 OR user_2 = NEW.user_1);

  IF user1_count >= 3 THEN
    RAISE EXCEPTION 'maximum limit of 3 active chats for user_1';
  END IF;

  SELECT COUNT(*) INTO user2_count
  FROM match_rooms
  WHERE abandoned_by IS NULL
    AND (user_1 = NEW.user_2 OR user_2 = NEW.user_2);

  IF user2_count >= 3 THEN
    RAISE EXCEPTION 'maximum limit of 3 active chats for user_2';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_room_chat_limit_trigger ON match_rooms;
CREATE TRIGGER match_room_chat_limit_trigger
  BEFORE INSERT ON match_rooms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_match_room_chat_limit();
