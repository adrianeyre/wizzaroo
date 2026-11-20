-- Wizzaroo's whole database, as one schema. The app isn't in production, so there is no trail of migrations:
-- change this file (and schema.ts) in place, and make a new database from it.
--
-- The app logs in as wizzaroo_app, which is no superuser, has no BYPASSRLS and owns nothing; the owner only applies
-- this schema (ADR 0027). Its login holds the reach's grants and policies alone, so RESET ROLE inside a reach gives
-- back no more than the reach. Credential checks and staff writes run outside any reach as wizzaroo_server, whose
-- grants and policies are written down here: every row of every table, but no TRUNCATE, no DDL, no programs, and the
-- Audit Log only read, added to and purged after its twelve months (ADR 0041).
--
-- Roles belong to the cluster, so the migrate command makes them again, with the app's password, every time it runs.
-- They are made here too, so the grants below have someone to name.
DO $$
BEGIN
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wizzaroo_reach') THEN
		CREATE ROLE "wizzaroo_reach" NOLOGIN;
	END IF;
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wizzaroo_server') THEN
		CREATE ROLE "wizzaroo_server" NOLOGIN NOINHERIT;
	END IF;
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wizzaroo_app') THEN
		CREATE ROLE "wizzaroo_app" NOLOGIN NOINHERIT;
	END IF;
END
$$;
GRANT "wizzaroo_reach" TO CURRENT_USER;
GRANT "wizzaroo_reach" TO "wizzaroo_app" WITH INHERIT TRUE, SET TRUE;
GRANT "wizzaroo_server" TO "wizzaroo_app" WITH INHERIT FALSE, SET TRUE;

-- Who reaches the schema at all.
GRANT USAGE ON SCHEMA public TO wizzaroo_reach;
GRANT USAGE ON SCHEMA public TO wizzaroo_server;

-- No route makes a temporary table, so no role holds TEMPORARY on the database through PUBLIC, the reach included
-- (pen-test finding D5, #299). The database's owner, and a superuser, keep it. The name differs per database, so the
-- statement is built here.
DO $$
BEGIN
	EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END
$$;


-- Types.
CREATE TYPE public.admin_access_served AS ENUM (
    'child-progress.opened',
    'school-children-progress.listed',
    'families.listed',
    'parents.listed',
    'deletion-requests.listed',
    'child.changed',
    'child-limits.changed',
    'child-teacher-locks.changed',
    'child-classmate-visits.changed',
    'child-birth.given',
    'child-school.changed'
);

CREATE TYPE public.audit_action AS ENUM (
    'sign-in.succeeded',
    'sign-in.failed',
    'sign-out',
    'two-factor.turned-on',
    'two-factor.turned-off',
    'passkey.added',
    'passkey.removed',
    'password.changed',
    'password.created',
    'password.removed',
    'password.reset',
    'email-address.changed',
    'family-device.created',
    'family-device.revoked',
    'picture-password.set',
    'school.created',
    'school.deleted',
    'school.classmate-visits-changed',
    'teacher.created',
    'teacher.year-groups-changed',
    'parent.created',
    'adult.deactivated',
    'invite.sent',
    'password-reset.sent-by-staff',
    'child.created',
    'child.school-changed',
    'child.deleted',
    'family.deleted',
    'deletion-request.created',
    'deletion-request.confirmed',
    'family-join.agreed',
    'family-join.turned-down',
    'password-reset.requested',
    'password-reset.rate-limited',
    'sign-in.rate-limited',
    'sign-out.other-browsers',
    'two-factor.turn-off-refused',
    'school.changed',
    'child.stars-awarded',
    'family-chest.coins-awarded',
    'child.changed',
    'child.limits-changed',
    'child.teacher-locks-changed',
    'child.classmate-visits-changed',
    'child.birth-given'
);

CREATE TYPE public.audit_actor_type AS ENUM (
    'user',
    'family-device',
    'none'
);

CREATE TYPE public.audit_target_type AS ENUM (
    'user',
    'school',
    'child',
    'family',
    'family-device',
    'passkey',
    'deletion-request'
);

CREATE TYPE public.play_event_type AS ENUM (
    'session-started',
    'session-ended',
    'question-answered',
    'activity-finished',
    'item-bought',
    'character-dressed',
    'outfit-saved',
    'outfit-worn',
    'room-furnished',
    'check-finished',
    'quest-find-picked-up',
    'quest-puzzle-solved'
);

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'teacher',
    'parent'
);


-- Sequences.
CREATE SEQUENCE public.replay_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- Tables, each followed by its indexes.

-- Each row records what a reply served the Admin, from a closed set with one value per reply path that logs, so a Family
-- can tell a progress read from a list or from a change, in the log and in its export (pen test D2, #270).
-- A row outlives the Admin's account, and the Child it names, as the Audit Log's entries do (ADR 0041, pen test B3, #287):
-- neither admin_user_id nor child_id is a foreign key. The daily purge deletes a deleted Child's rows once they are older
-- than the Audit Log's twelve months (src/server/audit/audit-log.ts).
CREATE TABLE public.admin_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    child_id uuid NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    served public.admin_access_served NOT NULL,
    CONSTRAINT admin_access_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX admin_access_logs_child_id_index ON public.admin_access_logs USING btree (child_id);

-- Security actions are kept in an audit log only the Admin reads, holding ids rather than personal data, for twelve months
-- (ADR 0041). The Admin's changes to another Family's Child, its Family Chest or a School are kept here too, naming the
-- action, the Admin and the target, with no values (pen test B3, #288). Adding a kind of action extends audit_action.
CREATE TABLE public.audit_log_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    happened_at timestamp with time zone DEFAULT now() NOT NULL,
    action public.audit_action NOT NULL,
    actor_type public.audit_actor_type NOT NULL,
    actor_id uuid,
    actor_roles public.user_role[],
    target_type public.audit_target_type,
    target_id text,
    detail text,
    ip_address inet,
    CONSTRAINT audit_log_entries_actor_check CHECK ((((actor_type = 'none'::public.audit_actor_type) = (actor_id IS NULL)) AND ((actor_type = 'user'::public.audit_actor_type) = (actor_roles IS NOT NULL)))),
    CONSTRAINT audit_log_entries_ip_address_check CHECK (((ip_address IS NULL) OR (action = ANY (ARRAY['sign-in.succeeded'::public.audit_action, 'sign-in.failed'::public.audit_action])))),
    CONSTRAINT audit_log_entries_target_check CHECK (((target_type IS NULL) = (target_id IS NULL))),
    CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE INDEX audit_log_entries_action_happened_at_index ON public.audit_log_entries USING btree (action, happened_at);
CREATE INDEX audit_log_entries_happened_at_index ON public.audit_log_entries USING btree (happened_at);

-- Every Family, Child and adult the Admin deletes is kept here by id alone. The backup container sends each one off the
-- server as it is confirmed, and restore.sh deletes every one again after a restore, so no backup taken before a deletion
-- brings it back (#280). Only the Admin's deletions write it, in the same transaction as the deletion.
CREATE TABLE public.confirmed_deletions (
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT confirmed_deletions_target_type_check CHECK ((target_type = ANY (ARRAY['family'::text, 'child'::text, 'user'::text]))),
    CONSTRAINT confirmed_deletions_target_type_target_id_pk PRIMARY KEY (target_type, target_id)
);

-- replay_restarted_at is the number at which the Family's replay last had to start again, because a record it had read
-- was changed or deleted (ADR 0055).
CREATE TABLE public.families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    replay_restarted_at bigint DEFAULT 0 NOT NULL,
    CONSTRAINT families_pkey PRIMARY KEY (id)
);

-- A School's name and town may be empty until the Admin gives them, as for the School first made for the owner's Children.
CREATE TABLE public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    town text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    classmate_visits_approved boolean DEFAULT false NOT NULL,
    CONSTRAINT schools_pkey PRIMARY KEY (id)
);

-- An adult's TOTP secret lives in totp_secrets, within that adult's reach alone (#258). An adult may set up a second factor
-- from a password alone only until second_factor_setup_until: 7 days from the account being made, from accepting an
-- Invite, or from using a reset link the Admin sent (#243).
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    roles public.user_role[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email_confirmed_at timestamp with time zone,
    name text,
    last_login_at timestamp with time zone,
    deactivated_at timestamp with time zone,
    second_factor_setup_until timestamp with time zone,
    passkey_user_handle uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- A Child's Year is worked out from birth month and year, the way src/curriculum/year-groups.ts does, on the UK date the
-- API set for the request, since a typed-in Year Group goes stale every September. Whether a Child has a Picture Password
-- is a column of its own, which staff's and Parents' reaches read; the hash itself lives on the Family Device (ADR 0005).
CREATE TABLE public.children (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    family_id uuid NOT NULL,
    nickname text NOT NULL,
    picture_password_hash text,
    synced_limits jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    phonics_programme_id text,
    school_id uuid NOT NULL,
    birth_month smallint,
    birth_year smallint,
    year_group_adjustment smallint DEFAULT 0 NOT NULL,
    classmate_visits_allowed boolean DEFAULT false NOT NULL,
    has_picture_password boolean GENERATED ALWAYS AS ((picture_password_hash IS NOT NULL)) STORED NOT NULL,
    CONSTRAINT children_birth_check CHECK ((((birth_month IS NULL) = (birth_year IS NULL)) AND ((birth_month >= 1) AND (birth_month <= 12)))),
    CONSTRAINT children_year_group_adjustment_check CHECK (((year_group_adjustment >= '-1'::integer) AND (year_group_adjustment <= 1))),
    CONSTRAINT children_id_family_id_unique UNIQUE (id, family_id),
    CONSTRAINT children_pkey PRIMARY KEY (id),
    CONSTRAINT children_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE,
    CONSTRAINT children_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE RESTRICT
);
CREATE INDEX children_family_id_index ON public.children USING btree (family_id);
CREATE INDEX children_school_id_index ON public.children USING btree (school_id);

CREATE TABLE public.deletion_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    family_id uuid NOT NULL,
    child_id uuid,
    requested_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deletion_requests_family_id_child_id_unique UNIQUE NULLS NOT DISTINCT (family_id, child_id),
    CONSTRAINT deletion_requests_pkey PRIMARY KEY (id),
    CONSTRAINT deletion_requests_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
    CONSTRAINT deletion_requests_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE,
    CONSTRAINT deletion_requests_requested_by_user_id_users_id_fk FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.email_address_checks (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT email_address_checks_pkey PRIMARY KEY (token_hash),
    CONSTRAINT email_address_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX email_address_checks_user_id_index ON public.email_address_checks USING btree (user_id);

CREATE TABLE public.family_chest_coin_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    family_id uuid NOT NULL,
    coins integer NOT NULL,
    awarded_by_user_id uuid,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    replay_sequence bigint NOT NULL,
    CONSTRAINT family_chest_coin_awards_coins_check CHECK (((coins >= 1) AND (coins <= 1000))),
    CONSTRAINT family_chest_coin_awards_pkey PRIMARY KEY (id),
    CONSTRAINT family_chest_coin_awards_awarded_by_user_id_users_id_fk FOREIGN KEY (awarded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT family_chest_coin_awards_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE
);
CREATE INDEX family_chest_coin_awards_family_id_index ON public.family_chest_coin_awards USING btree (family_id);

-- A Family Device's credential lapses 400 days after its last contact, the lifetime its cookie is given (#301). It keeps the
-- address it was last used from beside when (#302), so a Parent can tell a copied credential playing elsewhere from the
-- tablet at home; signing the device out clears it. It records the adult whose sign-in made it (#303), so their password
-- change or reset signs it out with their other sign-ins.
CREATE TABLE public.family_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    family_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_from inet,
    created_by_user_id uuid,
    CONSTRAINT family_devices_pkey PRIMARY KEY (id),
    CONSTRAINT family_devices_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT family_devices_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT family_devices_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE
);
CREATE INDEX family_devices_created_by_user_id_index ON public.family_devices USING btree (created_by_user_id);
CREATE INDEX family_devices_family_id_index ON public.family_devices USING btree (family_id);

-- A Teacher's new adult for an existing Family joins it, and gets their Invite, only once one of its Parents agrees (#264).
CREATE TABLE public.family_join_requests (
    user_id uuid NOT NULL,
    family_id uuid NOT NULL,
    requested_by_user_id uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    agreed_by_user_id uuid,
    agreed_at timestamp with time zone,
    CONSTRAINT family_join_requests_pkey PRIMARY KEY (user_id),
    CONSTRAINT family_join_requests_agreed_by_user_id_users_id_fk FOREIGN KEY (agreed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT family_join_requests_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE,
    CONSTRAINT family_join_requests_requested_by_user_id_users_id_fk FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT family_join_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX family_join_requests_family_id_index ON public.family_join_requests USING btree (family_id);

CREATE TABLE public.family_parents (
    user_id uuid NOT NULL,
    family_id uuid NOT NULL,
    CONSTRAINT family_parents_pkey PRIMARY KEY (user_id),
    CONSTRAINT family_parents_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE,
    CONSTRAINT family_parents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- An Invite is only for an adult with no login yet, and names the adult it is for (#249). A bulk upload's Invite emails go
-- out after the reply, so one that fails is marked on its Invite (pen-test finding B3, #293), and the uploader sends a new one.
CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    emailed_to text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    user_id uuid NOT NULL,
    created_by_user_id uuid,
    accepted_at timestamp with time zone,
    email_failed_at timestamp with time zone,
    CONSTRAINT invites_pkey PRIMARY KEY (id),
    CONSTRAINT invites_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT invites_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT invites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX invites_user_id_index ON public.invites USING btree (user_id);

CREATE TABLE public.kept_game_unlocks (
    child_id uuid NOT NULL,
    island_id text NOT NULL,
    region_id text NOT NULL,
    game_id text NOT NULL,
    CONSTRAINT kept_game_unlocks_child_id_island_id_region_id_game_id_pk PRIMARY KEY (child_id, island_id, region_id, game_id),
    CONSTRAINT kept_game_unlocks_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE
);

CREATE TABLE public.passkey_challenges (
    challenge text NOT NULL,
    user_id uuid,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT passkey_challenges_pkey PRIMARY KEY (challenge),
    CONSTRAINT passkey_challenges_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
-- Expired passkey challenges are found through this index (#331), so sweeping them reads only the expired rows, not the
-- whole table. The server sweeps at most once a minute, apart from making a challenge, so a challenge costs one insert.
CREATE INDEX passkey_challenges_expires_at_index ON public.passkey_challenges USING btree (expires_at);

-- The registration challenge a hand-off code was last given, which asking again replaces, so a code holds at most one (#238).
CREATE TABLE public.passkey_hand_offs (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    challenge text,
    CONSTRAINT passkey_hand_offs_pkey PRIMARY KEY (token_hash),
    CONSTRAINT passkey_hand_offs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX passkey_hand_offs_user_id_index ON public.passkey_hand_offs USING btree (user_id);

-- A passkey's WebAuthn user handle is an opaque id of its own, so registration options never carry the account id (#238).
CREATE TABLE public.passkeys (
    id text NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    public_key text NOT NULL,
    sign_count bigint NOT NULL,
    transports text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    CONSTRAINT passkeys_pkey PRIMARY KEY (id),
    CONSTRAINT passkeys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX passkeys_user_id_index ON public.passkeys USING btree (user_id);

CREATE TABLE public.password_resets (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    opens_second_factor_setup boolean DEFAULT false NOT NULL,
    CONSTRAINT password_resets_pkey PRIMARY KEY (token_hash),
    CONSTRAINT password_resets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX password_resets_user_id_index ON public.password_resets USING btree (user_id);

CREATE TABLE public.pending_sign_ins (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    failed_attempts smallint DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT pending_sign_ins_pkey PRIMARY KEY (token_hash),
    CONSTRAINT pending_sign_ins_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- A play event names one of its own Family's Children (#323). POST /api/play/events already refuses any other Child; the
-- foreign key on (child_id, family_id) holds the rule for every writer too, since a Teacher reads play_events by child_id alone.
-- Every record a Family's replay reads (play_events, star_awards, family_chest_coin_awards) is numbered from replay_sequence
-- as it is written, under a lock on its Family's row (ADR 0055).
CREATE TABLE public.play_events (
    id uuid NOT NULL,
    family_id uuid NOT NULL,
    family_device_id uuid NOT NULL,
    child_id uuid NOT NULL,
    type public.play_event_type NOT NULL,
    payload jsonb NOT NULL,
    happened_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    replay_sequence bigint NOT NULL,
    CONSTRAINT play_events_pkey PRIMARY KEY (id),
    CONSTRAINT play_events_child_id_family_id_children_id_family_id_fk FOREIGN KEY (child_id, family_id) REFERENCES public.children(id, family_id) ON DELETE CASCADE,
    CONSTRAINT play_events_family_device_id_family_devices_id_fk FOREIGN KEY (family_device_id) REFERENCES public.family_devices(id) ON DELETE CASCADE,
    CONSTRAINT play_events_family_id_families_id_fk FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE
);
CREATE INDEX play_events_child_id_index ON public.play_events USING btree (child_id);
CREATE INDEX play_events_family_id_index ON public.play_events USING btree (family_id);
CREATE INDEX play_events_family_id_replay_sequence_index ON public.play_events USING btree (family_id, replay_sequence);

-- Each recovery code is argon2id with a salt of its own (#255), so a code is checked against the adult's rows, found by user_id.
CREATE TABLE public.recovery_codes (
    code_hash text NOT NULL,
    user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT recovery_codes_pkey PRIMARY KEY (id),
    CONSTRAINT recovery_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX recovery_codes_user_id_index ON public.recovery_codes USING btree (user_id);

CREATE TABLE public.room_showcases (
    child_id uuid NOT NULL,
    loadout jsonb NOT NULL,
    room jsonb NOT NULL,
    trophies jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT room_showcases_pkey PRIMARY KEY (child_id),
    CONSTRAINT room_showcases_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE
);

CREATE TABLE public.school_parents (
    user_id uuid NOT NULL,
    school_id uuid NOT NULL,
    CONSTRAINT school_parents_user_id_school_id_pk PRIMARY KEY (user_id, school_id),
    CONSTRAINT school_parents_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT school_parents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX school_parents_school_id_index ON public.school_parents USING btree (school_id);

CREATE TABLE public.sign_ins (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_two_step boolean DEFAULT false NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sign_ins_pkey PRIMARY KEY (token_hash),
    CONSTRAINT sign_ins_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.star_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    child_id uuid NOT NULL,
    stars integer NOT NULL,
    awarded_by_user_id uuid,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    replay_sequence bigint NOT NULL,
    given_by_parent boolean DEFAULT false NOT NULL,
    CONSTRAINT star_awards_stars_check CHECK (((stars >= 1) AND (stars <= 1000))),
    CONSTRAINT star_awards_pkey PRIMARY KEY (id),
    CONSTRAINT star_awards_awarded_by_user_id_users_id_fk FOREIGN KEY (awarded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT star_awards_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE
);
CREATE INDEX star_awards_child_id_index ON public.star_awards USING btree (child_id);

CREATE TABLE public.teachers (
    user_id uuid NOT NULL,
    school_id uuid NOT NULL,
    CONSTRAINT teachers_pkey PRIMARY KEY (user_id),
    CONSTRAINT teachers_school_id_schools_id_fk FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT teachers_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX teachers_school_id_index ON public.teachers USING btree (school_id);

-- An adult's second factors are within reach of that adult alone: not a co-Parent's, a Teacher's or even the Admin's (#258).
-- The policies on users decide rows, not columns, so the TOTP secret has a table of its own. It is sealed with a key the
-- database never holds (ADR 0051). Wrong codes and pending sign-ins count against the adult here, not the pending sign-in
-- (#256): past the limits, codes aren't checked for the adult until code_pause_ends_at.
CREATE TABLE public.totp_secrets (
    user_id uuid NOT NULL,
    secret text NOT NULL,
    last_used_step integer,
    wrong_codes_at timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[] NOT NULL,
    code_pause_ends_at timestamp with time zone,
    pending_sign_ins_started_at timestamp with time zone[] DEFAULT '{}'::timestamp with time zone[] NOT NULL,
    CONSTRAINT totp_secrets_pkey PRIMARY KEY (user_id),
    CONSTRAINT totp_secrets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.totp_setups (
    user_id uuid NOT NULL,
    secret text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT totp_setups_pkey PRIMARY KEY (user_id),
    CONSTRAINT totp_setups_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.characters (
    child_id uuid NOT NULL,
    name text NOT NULL,
    loadout jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT characters_pkey PRIMARY KEY (child_id),
    CONSTRAINT characters_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE
);

CREATE TABLE public.child_teacher_locks (
    child_id uuid NOT NULL,
    locks jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by_user_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT child_teacher_locks_pkey PRIMARY KEY (child_id),
    CONSTRAINT child_teacher_locks_child_id_children_id_fk FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
    CONSTRAINT child_teacher_locks_updated_by_user_id_users_id_fk FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE public.teacher_year_groups (
    user_id uuid NOT NULL,
    year_group smallint NOT NULL,
    CONSTRAINT teacher_year_groups_year_group_check CHECK (((year_group >= 1) AND (year_group <= 6))),
    CONSTRAINT teacher_year_groups_user_id_year_group_pk PRIMARY KEY (user_id, year_group),
    CONSTRAINT teacher_year_groups_user_id_teachers_user_id_fk FOREIGN KEY (user_id) REFERENCES public.teachers(user_id) ON DELETE CASCADE
);


-- Functions the policies, triggers and routes call.

CREATE FUNCTION public.wizzaroo_caller_family_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('wizzaroo.family_id', true), '')::uuid $$;

CREATE FUNCTION public.wizzaroo_caller_is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(current_setting('wizzaroo.is_admin', true) = 'true', false) $$;

CREATE FUNCTION public.wizzaroo_caller_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('wizzaroo.user_id', true), '')::uuid $$;

CREATE FUNCTION public.wizzaroo_can_reach_family(family_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ SELECT wizzaroo_caller_is_admin() OR "family_id" = wizzaroo_caller_family_id() $$;

-- Answers a reach naming no adult, and only for a Child of that reach's Family. For any other reach or Child, null (#304).
CREATE FUNCTION public.wizzaroo_family_device_picture_password_hash(child_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT "children"."picture_password_hash"
		FROM "public"."children"
		WHERE "children"."id" = $1
			AND "public"."wizzaroo_caller_user_id"() IS NULL
			AND "children"."family_id" = "public"."wizzaroo_caller_family_id"()
	$_$;

CREATE FUNCTION public.wizzaroo_is_caller(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ SELECT wizzaroo_caller_is_admin() OR "user_id" = wizzaroo_caller_user_id() $$;

CREATE FUNCTION public.wizzaroo_is_caller_alone(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce("user_id" = wizzaroo_caller_user_id(), false) $$;

-- Numbers a record as it is written, whoever writes it, the owner and a restore's later rows included, so a Family's
-- records are committed in the order of their numbers and a reader that has seen number n has seen every record below it
-- (pen test F4, #318, #319, #320, ADR 0055). It runs as the owner because a Teacher's or a Family Device's reach can't lock
-- their Family's row, and it reads and writes nothing else. It also notes, for this transaction alone, the first number it
-- handed out, so a replay in the same transaction knows which records aren't committed yet and keeps none of them.
CREATE FUNCTION public.wizzaroo_number_replayed_record() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
	DECLARE
		"record_family_id" uuid;
	BEGIN
		IF TG_TABLE_NAME = 'star_awards' THEN
			SELECT "children"."family_id" INTO "record_family_id" FROM "children" WHERE "children"."id" = NEW."child_id";
		ELSE
			"record_family_id" := NEW."family_id";
		END IF;
		PERFORM FROM "families" WHERE "families"."id" = "record_family_id" FOR NO KEY UPDATE;
		NEW."replay_sequence" := nextval('public.replay_sequence');
		IF coalesce(current_setting('wizzaroo.replay_written_from', true), '') = '' THEN
			PERFORM set_config('wizzaroo.replay_written_from', NEW."replay_sequence"::text, true);
		END IF;
		RETURN NEW;
	END
	$$;

-- A Family Device's reach (a Family and no adult) changes only what play needs (pen-test finding D1, #276): setting a
-- Child's first Picture Password hash. Any other column, or a hash already set, stays a Parent's. A column grant can't
-- tell a device's reach from a Parent's, since both are wizzaroo_reach, so the trigger holds a reach naming no adult, after
-- RESET ROLE too. The generated has_picture_password is worked out after a BEFORE trigger runs, so it is left out with the hash.
CREATE FUNCTION public.wizzaroo_refuse_child_change_outside_play() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
	BEGIN
		IF row_security_active('public.children')
			AND pg_has_role(current_user, 'wizzaroo_reach', 'USAGE')
			AND wizzaroo_caller_user_id() IS NULL
			AND (
				OLD."picture_password_hash" IS NOT NULL
				OR (to_jsonb(NEW) - 'picture_password_hash' - 'has_picture_password')
					IS DISTINCT FROM (to_jsonb(OLD) - 'picture_password_hash' - 'has_picture_password')
			)
		THEN
			RAISE EXCEPTION 'a Family Device''s reach sets only a Child''s first Picture Password' USING ERRCODE = 'insufficient_privilege';
		END IF;
		RETURN NEW;
	END
	$$;

-- A column grant can't tell an adult's own row from the Admin's: only the Admin's reach deactivates anyone, or undoes it.
-- Row-level security is off for the owner and wizzaroo_server isn't the reach, so the trigger holds only a reach, after
-- RESET ROLE too.
CREATE FUNCTION public.wizzaroo_refuse_deactivation_outside_admin_reach() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
	BEGIN
		IF NEW."deactivated_at" IS DISTINCT FROM OLD."deactivated_at"
			AND row_security_active('public.users')
			AND pg_has_role(current_user, 'wizzaroo_reach', 'USAGE')
			AND NOT wizzaroo_caller_is_admin()
		THEN
			RAISE EXCEPTION 'only the Admin''s reach changes deactivated_at' USING ERRCODE = 'insufficient_privilege';
		END IF;
		RETURN NEW;
	END
	$$;

-- A record the replay may already have read is changed or deleted, so each of its Families' replays starts again.
CREATE FUNCTION public.wizzaroo_restart_family_replays() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
	BEGIN
		IF TG_TABLE_NAME = 'star_awards' THEN
			UPDATE "families" SET "replay_restarted_at" = nextval('public.replay_sequence')
			WHERE "families"."id" IN (
				SELECT "children"."family_id" FROM "changed_records"
				JOIN "children" ON "children"."id" = "changed_records"."child_id"
			);
		ELSE
			UPDATE "families" SET "replay_restarted_at" = nextval('public.replay_sequence')
			WHERE "families"."id" IN (SELECT "changed_records"."family_id" FROM "changed_records");
		END IF;
		RETURN NULL;
	END
	$$;

CREATE FUNCTION public.wizzaroo_today() RETURNS date
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(nullif(current_setting('wizzaroo.today', true), '')::date, (now() AT TIME ZONE 'Europe/London')::date) $$;

-- A Teacher's reach follows their user id, and is off on a Parent route or the Family export, which run within the
-- Parent's own Family alone (#261, ADR 0027): runWithinReach sets wizzaroo.own_family_only for those.
CREATE FUNCTION public.wizzaroo_caller_teacher_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT CASE WHEN current_setting('wizzaroo.own_family_only', true) = 'true' THEN NULL ELSE wizzaroo_caller_user_id() END $$;

-- Every function a policy calls that reads a table searches pg_temp last, so a reach's temporary table can't stand in for
-- the table it reads (pen-test finding D5, #299, ADR 0027).
CREATE FUNCTION public.wizzaroo_can_reach_user(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
		SELECT wizzaroo_is_caller("user_id") OR (wizzaroo_caller_user_id() IS NOT NULL AND EXISTS (
			SELECT FROM "family_parents"
			WHERE "family_parents"."user_id" = "wizzaroo_can_reach_user"."user_id"
				AND "family_parents"."family_id" = wizzaroo_caller_family_id()
		))
	$$;

CREATE FUNCTION public.wizzaroo_can_see_school(school_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT wizzaroo_caller_is_admin()
			OR EXISTS (
				SELECT FROM "teachers"
				JOIN "users" ON "users"."id" = "teachers"."user_id"
				WHERE "teachers"."user_id" = wizzaroo_caller_teacher_user_id()
					AND "users"."deactivated_at" IS NULL
					AND "teachers"."school_id" = $1
			) OR EXISTS (
				SELECT FROM "school_parents"
				WHERE "school_parents"."user_id" = wizzaroo_caller_user_id() AND "school_parents"."school_id" = $1
			) OR EXISTS (
				SELECT FROM "children"
				WHERE "children"."family_id" = wizzaroo_caller_family_id() AND "children"."school_id" = $1
			)
	$_$;

CREATE FUNCTION public.wizzaroo_school_year(birth_month smallint, birth_year smallint, adjustment smallint) RETURNS smallint
    LANGUAGE sql STABLE
    AS $$
		SELECT ((extract(year FROM wizzaroo_today())::integer - CASE WHEN extract(month FROM wizzaroo_today()) >= 9 THEN 0 ELSE 1 END)
			- ("birth_year" + CASE WHEN "birth_month" >= 9 THEN 6 ELSE 5 END) + 1 + "adjustment")::smallint
	$$;

CREATE FUNCTION public.wizzaroo_teacher_can_reach_year_group(school_id uuid, year_group smallint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT EXISTS (
			SELECT FROM "teachers"
			JOIN "teacher_year_groups" ON "teacher_year_groups"."user_id" = "teachers"."user_id"
			JOIN "users" ON "users"."id" = "teachers"."user_id"
			WHERE "teachers"."user_id" = wizzaroo_caller_teacher_user_id()
				AND "users"."deactivated_at" IS NULL
				AND "teachers"."school_id" = $1
				AND "teacher_year_groups"."year_group" = $2
		)
	$_$;

CREATE FUNCTION public.wizzaroo_can_visit_classmate_room(visitor_child_id uuid, room_child_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT wizzaroo_caller_user_id() IS NULL AND EXISTS (
			SELECT FROM "children" "visitor"
			JOIN "children" "classmate" ON "classmate"."school_id" = "visitor"."school_id"
			JOIN "schools" ON "schools"."id" = "visitor"."school_id"
			WHERE "visitor"."id" = $1
				AND "classmate"."id" = $2
				AND "schools"."classmate_visits_approved"
				AND "visitor"."family_id" <> "classmate"."family_id"
				AND "visitor"."family_id" = wizzaroo_caller_family_id()
				AND "visitor"."classmate_visits_allowed"
				AND "classmate"."classmate_visits_allowed"
				AND "visitor"."birth_month" IS NOT NULL
				AND "classmate"."birth_month" IS NOT NULL
				AND wizzaroo_school_year("visitor"."birth_month", "visitor"."birth_year", "visitor"."year_group_adjustment")
					= wizzaroo_school_year("classmate"."birth_month", "classmate"."birth_year", "classmate"."year_group_adjustment")
		)
	$_$;

CREATE FUNCTION public.wizzaroo_teacher_can_reach_child_row(school_id uuid, birth_month smallint, birth_year smallint, adjustment smallint) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
		SELECT "birth_month" IS NOT NULL
			AND wizzaroo_teacher_can_reach_year_group("school_id", wizzaroo_school_year("birth_month", "birth_year", "adjustment"))
	$$;

-- A Teacher also reaches the Family of their School's Parents who have no Children yet, so they can add its first Child.
-- A Teacher's reach is on only while their user id names a Teacher who isn't deactivated (#266).
CREATE FUNCTION public.wizzaroo_teacher_can_reach_family(family_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT EXISTS (
			SELECT FROM "children"
			WHERE "children"."family_id" = $1
				AND wizzaroo_teacher_can_reach_child_row("children"."school_id", "children"."birth_month", "children"."birth_year", "children"."year_group_adjustment")
		) OR (
			NOT EXISTS (SELECT FROM "children" WHERE "children"."family_id" = $1)
			AND EXISTS (
				SELECT FROM "family_parents"
				JOIN "school_parents" ON "school_parents"."user_id" = "family_parents"."user_id"
				JOIN "teachers" ON "teachers"."school_id" = "school_parents"."school_id"
				JOIN "users" ON "users"."id" = "teachers"."user_id"
				WHERE "family_parents"."family_id" = $1
					AND "teachers"."user_id" = wizzaroo_caller_teacher_user_id()
					AND "users"."deactivated_at" IS NULL
			)
		)
	$_$;

CREATE FUNCTION public.wizzaroo_teacher_can_reach_user(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT EXISTS (
			SELECT FROM "family_parents"
			WHERE "family_parents"."user_id" = $1
				AND wizzaroo_teacher_can_reach_family("family_parents"."family_id")
		) OR EXISTS (
			SELECT FROM "school_parents"
			JOIN "teachers" ON "teachers"."school_id" = "school_parents"."school_id"
			JOIN "users" ON "users"."id" = "teachers"."user_id"
			WHERE "school_parents"."user_id" = $1
				AND "teachers"."user_id" = wizzaroo_caller_teacher_user_id()
				AND "users"."deactivated_at" IS NULL
				AND NOT EXISTS (
					SELECT FROM "family_parents"
					JOIN "children" ON "children"."family_id" = "family_parents"."family_id"
					WHERE "family_parents"."user_id" = $1
				)
		)
	$_$;

-- An adult has a login once they have a password, a passkey or an accepted Invite (#249). Staff lists use this to show who
-- has set up a login: a Teacher's reach can't see another adult's passkeys or Invites, so it asks here. It answers only
-- the Admin, and a Teacher about an adult their own policies already show them. Its tables are named in full.
CREATE FUNCTION public.wizzaroo_user_has_login(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT ("public"."wizzaroo_caller_is_admin"() OR "public"."wizzaroo_teacher_can_reach_user"($1))
			AND (
				EXISTS (
					SELECT FROM "public"."users"
					WHERE "users"."id" = $1 AND "users"."password_hash" IS NOT NULL
				) OR EXISTS (
					SELECT FROM "public"."passkeys" WHERE "passkeys"."user_id" = $1
				) OR EXISTS (
					SELECT FROM "public"."invites"
					WHERE "invites"."user_id" = $1 AND "invites"."accepted_at" IS NOT NULL
				)
			)
	$_$;

CREATE FUNCTION public.wizzaroo_teacher_can_reach_child(child_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
		SELECT EXISTS (
			SELECT FROM "children"
			WHERE "children"."id" = $1
				AND wizzaroo_teacher_can_reach_child_row("children"."school_id", "children"."birth_month", "children"."birth_year", "children"."year_group_adjustment")
		)
	$_$;

REVOKE ALL ON FUNCTION public.wizzaroo_family_device_picture_password_hash(child_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.wizzaroo_family_device_picture_password_hash(child_id uuid) TO wizzaroo_reach;


-- Triggers.

CREATE TRIGGER children_changed_by_family_devices_for_play_alone BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION public.wizzaroo_refuse_child_change_outside_play();

CREATE TRIGGER family_chest_coin_awards_changed_restart_replays AFTER UPDATE ON public.family_chest_coin_awards REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER family_chest_coin_awards_deleted_restart_replays AFTER DELETE ON public.family_chest_coin_awards REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER family_chest_coin_awards_numbered_for_replay BEFORE INSERT ON public.family_chest_coin_awards FOR EACH ROW EXECUTE FUNCTION public.wizzaroo_number_replayed_record();

CREATE TRIGGER play_events_changed_restart_replays AFTER UPDATE ON public.play_events REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER play_events_deleted_restart_replays AFTER DELETE ON public.play_events REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER play_events_numbered_for_replay BEFORE INSERT ON public.play_events FOR EACH ROW EXECUTE FUNCTION public.wizzaroo_number_replayed_record();

CREATE TRIGGER star_awards_changed_restart_replays AFTER UPDATE ON public.star_awards REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER star_awards_deleted_restart_replays AFTER DELETE ON public.star_awards REFERENCING OLD TABLE AS changed_records FOR EACH STATEMENT EXECUTE FUNCTION public.wizzaroo_restart_family_replays();
CREATE TRIGGER star_awards_numbered_for_replay BEFORE INSERT ON public.star_awards FOR EACH ROW EXECUTE FUNCTION public.wizzaroo_number_replayed_record();

CREATE TRIGGER users_deactivated_by_admin_alone BEFORE UPDATE OF deactivated_at ON public.users FOR EACH ROW EXECUTE FUNCTION public.wizzaroo_refuse_deactivation_outside_admin_reach();


-- Row-level security, policies and grants, table by table.

-- admin_access_logs
--
-- Append-only to the reach role, as the Audit Log is (ADR 0027, ADR 0041): the Admin's connection reads it, each Family
-- reads its own Children's rows while the Child is still theirs, and a row is added only in the signed-in Admin's own
-- name, timed by the transaction that adds it (#269). Erasure and retention run on wizzaroo_server's paths.
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_access_logs_on_server_paths ON public.admin_access_logs TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY admin_access_logs_read_by_admin ON public.admin_access_logs FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

CREATE POLICY admin_access_logs_seen_by_family ON public.admin_access_logs FOR SELECT TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = admin_access_logs.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

CREATE POLICY admin_access_logs_written_by_admin ON public.admin_access_logs FOR INSERT TO wizzaroo_reach WITH CHECK ((public.wizzaroo_caller_is_admin() AND (admin_user_id = public.wizzaroo_caller_user_id()) AND (opened_at = now())));

GRANT SELECT,INSERT ON TABLE public.admin_access_logs TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_access_logs TO wizzaroo_server;

-- audit_log_entries
--
-- A connection writes entries only in its own name: an adult as themselves, a Family Device as one of its Family's devices.
-- An entry younger than auditLogRetentionMonths (src/server/audit/audit-log.ts) can't be deleted, the purge's included.
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_entries_expired_purged_on_server_paths ON public.audit_log_entries FOR DELETE TO wizzaroo_server USING ((happened_at < (now() - make_interval(months => 12))));

CREATE POLICY audit_log_entries_read_by_admin ON public.audit_log_entries FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

CREATE POLICY audit_log_entries_read_on_server_paths ON public.audit_log_entries FOR SELECT TO wizzaroo_server USING (true);

CREATE POLICY audit_log_entries_written_by_caller ON public.audit_log_entries FOR INSERT TO wizzaroo_reach WITH CHECK ((((actor_type = 'user'::public.audit_actor_type) AND (actor_id = public.wizzaroo_caller_user_id())) OR ((actor_type = 'family-device'::public.audit_actor_type) AND (public.wizzaroo_caller_user_id() IS NULL) AND (EXISTS ( SELECT
   FROM public.family_devices
  WHERE ((family_devices.id = audit_log_entries.actor_id) AND (family_devices.family_id = public.wizzaroo_caller_family_id())))))));

CREATE POLICY audit_log_entries_written_on_server_paths ON public.audit_log_entries FOR INSERT TO wizzaroo_server WITH CHECK (true);

GRANT SELECT,INSERT ON TABLE public.audit_log_entries TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE ON TABLE public.audit_log_entries TO wizzaroo_server;

-- characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY characters_on_server_paths ON public.characters TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY characters_within_reach ON public.characters TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = characters.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

CREATE POLICY characters_within_teacher_reach ON public.characters FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_child(child_id));

GRANT SELECT,INSERT,UPDATE ON TABLE public.characters TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.characters TO wizzaroo_server;

-- child_teacher_locks
--
-- A Family reads its Children's Teacher locks so they reach Family Devices, but only Teachers and the Admin change them.
ALTER TABLE public.child_teacher_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY child_teacher_locks_on_server_paths ON public.child_teacher_locks TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY child_teacher_locks_seen_by_family ON public.child_teacher_locks FOR SELECT TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = child_teacher_locks.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

CREATE POLICY child_teacher_locks_within_teacher_reach ON public.child_teacher_locks TO wizzaroo_reach USING ((public.wizzaroo_caller_is_admin() OR public.wizzaroo_teacher_can_reach_child(child_id))) WITH CHECK ((public.wizzaroo_caller_is_admin() OR public.wizzaroo_teacher_can_reach_child(child_id)));

GRANT SELECT,INSERT,UPDATE ON TABLE public.child_teacher_locks TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.child_teacher_locks TO wizzaroo_server;

-- children
--
-- No reach reads a Picture Password hash (#304, ADR 0027): row-level security picks rows, not columns, so the reach role
-- holds SELECT on every column of children but picture_password_hash, and a new column is unreadable within a reach until
-- it is granted here. GET /api/play/family hands a Family Device its own Family's hashes through
-- wizzaroo_family_device_picture_password_hash.
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY children_deleted_by_admin_alone ON public.children AS RESTRICTIVE FOR DELETE TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

CREATE POLICY children_on_server_paths ON public.children TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY children_within_reach ON public.children TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id));

CREATE POLICY children_within_teacher_reach ON public.children FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_child_row(school_id, birth_month, birth_year, year_group_adjustment));

GRANT INSERT,DELETE,UPDATE ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.children TO wizzaroo_server;
GRANT SELECT(id) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(family_id) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(nickname) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(synced_limits) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(created_at) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(phonics_programme_id) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(school_id) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(birth_month) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(birth_year) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(year_group_adjustment) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(classmate_visits_allowed) ON TABLE public.children TO wizzaroo_reach;
GRANT SELECT(has_picture_password) ON TABLE public.children TO wizzaroo_reach;

-- confirmed_deletions
--
-- No reach reads, changes or removes a row: the backup container reads it as the owner.
ALTER TABLE public.confirmed_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY confirmed_deletions_on_server_paths ON public.confirmed_deletions TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY confirmed_deletions_written_by_admin ON public.confirmed_deletions FOR INSERT TO wizzaroo_reach WITH CHECK (public.wizzaroo_caller_is_admin());

GRANT INSERT ON TABLE public.confirmed_deletions TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.confirmed_deletions TO wizzaroo_server;

-- deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY deletion_requests_on_server_paths ON public.deletion_requests TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY deletion_requests_within_reach ON public.deletion_requests TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id));

GRANT SELECT,INSERT,UPDATE ON TABLE public.deletion_requests TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.deletion_requests TO wizzaroo_server;

-- email_address_checks
ALTER TABLE public.email_address_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_address_checks_on_server_paths ON public.email_address_checks TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY email_address_checks_within_reach ON public.email_address_checks TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,INSERT,DELETE ON TABLE public.email_address_checks TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.email_address_checks TO wizzaroo_server;

-- families
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY families_deleted_by_admin_alone ON public.families AS RESTRICTIVE FOR DELETE TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

CREATE POLICY families_on_server_paths ON public.families TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY families_within_reach ON public.families TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(id));

CREATE POLICY families_within_teacher_reach ON public.families FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_family(id));

GRANT SELECT,DELETE ON TABLE public.families TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.families TO wizzaroo_server;

-- family_chest_coin_awards
--
-- A Family reads what the Admin gave its Family Chest so it reaches Family Devices, but only the Admin gives it.
ALTER TABLE public.family_chest_coin_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_chest_coin_awards_given_by_admin ON public.family_chest_coin_awards TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin()) WITH CHECK (public.wizzaroo_caller_is_admin());

CREATE POLICY family_chest_coin_awards_on_server_paths ON public.family_chest_coin_awards TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY family_chest_coin_awards_seen_by_family ON public.family_chest_coin_awards FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id));

GRANT SELECT,INSERT ON TABLE public.family_chest_coin_awards TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.family_chest_coin_awards TO wizzaroo_server;

-- family_devices
--
-- A Family Device's reach reads its Family's devices but changes none of them: its last contact is recorded on
-- wizzaroo_server's path before its reach opens. Signing a device in, and revoking it, are its Family's Parents' (#276).
ALTER TABLE public.family_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_devices_managed_by_parents ON public.family_devices TO wizzaroo_reach USING (((public.wizzaroo_caller_user_id() IS NOT NULL) AND (family_id = public.wizzaroo_caller_family_id()))) WITH CHECK (((public.wizzaroo_caller_user_id() IS NOT NULL) AND (family_id = public.wizzaroo_caller_family_id())));

CREATE POLICY family_devices_on_server_paths ON public.family_devices TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY family_devices_within_reach ON public.family_devices FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id));

GRANT SELECT,INSERT,UPDATE ON TABLE public.family_devices TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.family_devices TO wizzaroo_server;

-- family_join_requests
--
-- The Family's Parents and the Admin read them, and no Family Device or Teacher does; every change runs on
-- wizzaroo_server's paths once the API has checked the caller's reach.
ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_join_requests_on_server_paths ON public.family_join_requests TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY family_join_requests_within_reach ON public.family_join_requests FOR SELECT TO wizzaroo_reach USING (((public.wizzaroo_caller_user_id() IS NOT NULL) AND public.wizzaroo_can_reach_family(family_id)));

GRANT SELECT ON TABLE public.family_join_requests TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.family_join_requests TO wizzaroo_server;

-- family_parents
--
-- Who is in a Family is decided by staff, on wizzaroo_server's paths once the API has checked their reach, and by a Parent
-- agreeing to a join request, also on those paths. No reach adds, moves or removes anyone, the Admin's included (#275).
-- Deleting an adult or a Family still removes their rows, since a foreign key's cascade runs as the table's owner.
ALTER TABLE public.family_parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY family_parents_on_server_paths ON public.family_parents TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY family_parents_within_reach ON public.family_parents FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id));

CREATE POLICY family_parents_within_teacher_reach ON public.family_parents FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_family(family_id));

GRANT SELECT ON TABLE public.family_parents TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.family_parents TO wizzaroo_server;

-- invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_on_server_paths ON public.invites TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY invites_within_reach ON public.invites TO wizzaroo_reach USING (public.wizzaroo_can_reach_user(user_id));

GRANT SELECT,INSERT,DELETE ON TABLE public.invites TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.invites TO wizzaroo_server;

-- kept_game_unlocks
--
-- No reach writes a Child's kept game unlocks: that happens on wizzaroo_server's paths.
ALTER TABLE public.kept_game_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY kept_game_unlocks_on_server_paths ON public.kept_game_unlocks TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY kept_game_unlocks_within_reach ON public.kept_game_unlocks TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = kept_game_unlocks.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

CREATE POLICY kept_game_unlocks_within_teacher_reach ON public.kept_game_unlocks FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_child(child_id));

GRANT SELECT ON TABLE public.kept_game_unlocks TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.kept_game_unlocks TO wizzaroo_server;

-- passkey_challenges
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY passkey_challenges_on_server_paths ON public.passkey_challenges TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY passkey_challenges_within_reach ON public.passkey_challenges TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,INSERT,DELETE ON TABLE public.passkey_challenges TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.passkey_challenges TO wizzaroo_server;

-- passkey_hand_offs
ALTER TABLE public.passkey_hand_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY passkey_hand_offs_on_server_paths ON public.passkey_hand_offs TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY passkey_hand_offs_within_reach ON public.passkey_hand_offs TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,INSERT,DELETE ON TABLE public.passkey_hand_offs TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.passkey_hand_offs TO wizzaroo_server;

-- passkeys
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY passkeys_on_server_paths ON public.passkeys TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY passkeys_within_reach ON public.passkeys TO wizzaroo_reach USING (public.wizzaroo_is_caller_alone(user_id));

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.passkeys TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.passkeys TO wizzaroo_server;

-- password_resets
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY password_resets_on_server_paths ON public.password_resets TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY password_resets_within_reach ON public.password_resets TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,DELETE ON TABLE public.password_resets TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.password_resets TO wizzaroo_server;

-- pending_sign_ins
ALTER TABLE public.pending_sign_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_sign_ins_on_server_paths ON public.pending_sign_ins TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY pending_sign_ins_within_reach ON public.pending_sign_ins TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,DELETE ON TABLE public.pending_sign_ins TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pending_sign_ins TO wizzaroo_server;

-- play_events
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY play_events_deleted_by_admin_alone ON public.play_events AS RESTRICTIVE FOR DELETE TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

CREATE POLICY play_events_on_server_paths ON public.play_events TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY play_events_within_reach ON public.play_events TO wizzaroo_reach USING (public.wizzaroo_can_reach_family(family_id)) WITH CHECK ((public.wizzaroo_can_reach_family(family_id) AND (EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = play_events.child_id) AND (children.family_id = play_events.family_id))))));

CREATE POLICY play_events_within_teacher_reach ON public.play_events FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_child(child_id));

GRANT SELECT,INSERT,DELETE ON TABLE public.play_events TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.play_events TO wizzaroo_server;

-- recovery_codes
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_codes_on_server_paths ON public.recovery_codes TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY recovery_codes_within_reach ON public.recovery_codes TO wizzaroo_reach USING (public.wizzaroo_is_caller_alone(user_id));

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recovery_codes TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recovery_codes TO wizzaroo_server;

-- room_showcases
--
-- Classmates' Rooms stay shut at a School until the Admin confirms its data processing agreement names them (ADR 0031).
ALTER TABLE public.room_showcases ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_showcases_on_server_paths ON public.room_showcases TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY room_showcases_seen_by_classmates ON public.room_showcases FOR SELECT TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children visitor
  WHERE public.wizzaroo_can_visit_classmate_room(visitor.id, room_showcases.child_id))));

CREATE POLICY room_showcases_within_reach ON public.room_showcases TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = room_showcases.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

GRANT SELECT,INSERT,UPDATE ON TABLE public.room_showcases TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.room_showcases TO wizzaroo_server;

-- school_parents
--
-- No reach links a Parent to a School: that happens on wizzaroo_server's paths.
ALTER TABLE public.school_parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY school_parents_on_server_paths ON public.school_parents TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY school_parents_seen ON public.school_parents FOR SELECT TO wizzaroo_reach USING (((user_id = public.wizzaroo_caller_user_id()) OR public.wizzaroo_teacher_can_reach_user(user_id)));

CREATE POLICY school_parents_within_admin_reach ON public.school_parents TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

GRANT SELECT ON TABLE public.school_parents TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.school_parents TO wizzaroo_server;

-- schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY schools_on_server_paths ON public.schools TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY schools_seen ON public.schools FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_can_see_school(id));

CREATE POLICY schools_within_admin_reach ON public.schools TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.schools TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.schools TO wizzaroo_server;

-- sign_ins
--
-- A sign-in is made on wizzaroo_server's path, before anyone is known; a reach marks it two-step or ends it.
ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY sign_ins_on_server_paths ON public.sign_ins TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY sign_ins_within_reach ON public.sign_ins TO wizzaroo_reach USING (public.wizzaroo_is_caller(user_id));

GRANT SELECT,DELETE,UPDATE ON TABLE public.sign_ins TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sign_ins TO wizzaroo_server;

-- star_awards
--
-- A Family reads the Stars given to its Children so they reach Family Devices. The Admin gives any number; a Parent
-- gives their own Children 5, 10 or 15 at a time, as themselves, from the Awards page, and the route holds them to 15 a
-- Child a day (ADR 0063). A Family Device's reach names no adult, so it gives none.
ALTER TABLE public.star_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY star_awards_given_by_admin ON public.star_awards TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin()) WITH CHECK (public.wizzaroo_caller_is_admin());

CREATE POLICY star_awards_given_by_parent ON public.star_awards FOR INSERT TO wizzaroo_reach WITH CHECK ((given_by_parent AND (stars = ANY (ARRAY[5, 10, 15])) AND public.wizzaroo_is_caller_alone(awarded_by_user_id) AND (EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = star_awards.child_id) AND (children.family_id = public.wizzaroo_caller_family_id()))))));

CREATE POLICY star_awards_on_server_paths ON public.star_awards TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY star_awards_seen_by_family ON public.star_awards FOR SELECT TO wizzaroo_reach USING ((EXISTS ( SELECT
   FROM public.children
  WHERE ((children.id = star_awards.child_id) AND public.wizzaroo_can_reach_family(children.family_id)))));

GRANT SELECT,INSERT ON TABLE public.star_awards TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.star_awards TO wizzaroo_server;

-- teacher_year_groups
ALTER TABLE public.teacher_year_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_year_groups_on_server_paths ON public.teacher_year_groups TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY teacher_year_groups_seen_by_their_teacher ON public.teacher_year_groups FOR SELECT TO wizzaroo_reach USING ((user_id = public.wizzaroo_caller_user_id()));

CREATE POLICY teacher_year_groups_within_admin_reach ON public.teacher_year_groups TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

GRANT SELECT,INSERT,DELETE ON TABLE public.teacher_year_groups TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teacher_year_groups TO wizzaroo_server;

-- teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY teachers_on_server_paths ON public.teachers TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY teachers_seen_by_themselves ON public.teachers FOR SELECT TO wizzaroo_reach USING ((user_id = public.wizzaroo_caller_user_id()));

CREATE POLICY teachers_within_admin_reach ON public.teachers TO wizzaroo_reach USING (public.wizzaroo_caller_is_admin());

GRANT SELECT,INSERT,UPDATE ON TABLE public.teachers TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.teachers TO wizzaroo_server;

-- totp_secrets
ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY totp_secrets_on_server_paths ON public.totp_secrets TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY totp_secrets_within_reach ON public.totp_secrets TO wizzaroo_reach USING (public.wizzaroo_is_caller_alone(user_id));

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.totp_secrets TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.totp_secrets TO wizzaroo_server;

-- totp_setups
ALTER TABLE public.totp_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY totp_setups_on_server_paths ON public.totp_setups TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY totp_setups_within_reach ON public.totp_setups TO wizzaroo_reach USING (public.wizzaroo_is_caller_alone(user_id));

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.totp_setups TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.totp_setups TO wizzaroo_server;

-- users
--
-- A reach changes only the users columns the API changes within one, and only the caller's own row unless the caller is
-- the Admin (pen-test finding D1-2, #274): an adult's own password_hash, and the Admin's change to another adult's
-- deactivated_at. No reach is granted roles, email, email_confirmed_at, name, last_login_at, id or created_at: those
-- change on wizzaroo_server's paths or never (ADR 0026, ADR 0027). Co-Parents see each other's account rows but change
-- only their own. Only the Admin's reach makes an adult, a Teacher; a Teacher makes Parents on wizzaroo_server's paths.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_added_by_admin ON public.users FOR INSERT TO wizzaroo_reach WITH CHECK (public.wizzaroo_caller_is_admin());

CREATE POLICY users_changed_by_themselves ON public.users FOR UPDATE TO wizzaroo_reach USING (public.wizzaroo_is_caller(id)) WITH CHECK (public.wizzaroo_is_caller(id));

CREATE POLICY users_on_server_paths ON public.users TO wizzaroo_server USING (true) WITH CHECK (true);

CREATE POLICY users_removed_within_reach ON public.users FOR DELETE TO wizzaroo_reach USING (public.wizzaroo_can_reach_user(id));

CREATE POLICY users_within_reach ON public.users FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_can_reach_user(id));

CREATE POLICY users_within_teacher_reach ON public.users FOR SELECT TO wizzaroo_reach USING (public.wizzaroo_teacher_can_reach_user(id));

GRANT SELECT,INSERT,DELETE ON TABLE public.users TO wizzaroo_reach;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO wizzaroo_server;
GRANT UPDATE(password_hash) ON TABLE public.users TO wizzaroo_reach;
GRANT UPDATE(deactivated_at) ON TABLE public.users TO wizzaroo_reach;
