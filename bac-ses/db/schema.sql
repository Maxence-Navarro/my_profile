-- Schéma PostgreSQL — Plateforme de révision Bac SES
-- Compatible Supabase (PostgreSQL 15+). Testé localement avec PostgreSQL 16.
--
-- Trois couches :
--   staging_*   : données brutes collectées par le pipeline (régénérables)
--   tables métier (chapters, exam_sessions, subjects, ...) : contenu éditorial vérifié
--   published_subjects (vue) : ce que le site expose
--
-- Identifiants stables : un sujet = une question d'examen, identifiée par le code officiel
-- de l'épreuve + la partie (ex. 22-SESJ1ME1-EC2). Jamais par son intitulé.

BEGIN;

CREATE TYPE program_field AS ENUM ('science-economique', 'sociologie-science-politique', 'regards-croises');
CREATE TYPE chapter_status AS ENUM ('published', 'coming_soon', 'excluded_from_written');
CREATE TYPE exercise_type AS ENUM ('EC1', 'EC2', 'EC3', 'dissertation');
CREATE TYPE verification_status AS ENUM ('a_verifier', 'verifie_source_officielle', 'verifie_source_tierce', 'incoherence_signalee');
CREATE TYPE correction_search_status AS ENUM ('a_rechercher', 'sources_trouvees', 'aucune_source_fiable');
CREATE TYPE pedagogical_status AS ENUM (
  'a_rechercher', 'sources_trouvees', 'en_redaction', 'a_verifier_grille',
  'verifie_pedagogiquement', 'valide_relecture_humaine'
);
CREATE TYPE grid_match_status AS ENUM ('correspondance_verifiee', 'correspondance_non_verifiee', 'grille_non_retrouvee');
CREATE TYPE similarity_type AS ENUM ('identique', 'tres_proche_adaptation', 'meme_theme_corriges_distincts', 'incertain');
CREATE TYPE access_tier AS ENUM ('free', 'premium');
CREATE TYPE document_accessibility AS ENUM ('accessible_officiel', 'accessible_archive', 'accessible_tiers', 'inaccessible');

CREATE TABLE chapters (
  id              text PRIMARY KEY,                 -- ex. 'croissance'
  number          smallint NOT NULL UNIQUE,         -- 1..9 pour l'écrit
  title           text NOT NULL,
  field           program_field NOT NULL,
  display_order   smallint NOT NULL,
  status          chapter_status NOT NULL DEFAULT 'coming_soon',
  summary         text
);

CREATE TABLE exam_sessions (
  id              text PRIMARY KEY,                 -- code officiel, ex. '22-SESJ1ME1'
  year            smallint NOT NULL,
  session         text NOT NULL,                    -- 'normale' | 'remplacement' | 'secours'
  day             text,                             -- 'J1' | 'J2'
  center          text NOT NULL,                    -- ex. 'France métropolitaine'
  bareme_regime   text NOT NULL DEFAULT '2021-2026',-- barème 4/6/10 (avant la session 2027)
  sources         jsonb NOT NULL DEFAULT '[]'       -- URLs officielles / archives / tiers
);

CREATE TABLE subjects (
  id                       text PRIMARY KEY,        -- ex. '22-SESJ1ME1-EC2'
  slug                     text NOT NULL UNIQUE,    -- URL stable
  exam_session_id          text NOT NULL REFERENCES exam_sessions(id),
  chapter_id               text NOT NULL REFERENCES chapters(id),
  exercise_type            exercise_type NOT NULL,
  variant                  text,                    -- 'A' / 'B' (sessions 2021)
  question                 text NOT NULL,           -- intitulé exact
  sub_questions            jsonb NOT NULL DEFAULT '[]', -- EC2 : [{n, text, points}]
  points                   numeric(4,1),
  statement_md             text,                    -- énoncé reproduit (si autorisé)
  instruction_verb         text,                    -- verbe de consigne
  notions                  text[] NOT NULL DEFAULT '{}',
  verification_status      verification_status NOT NULL DEFAULT 'a_verifier',
  correction_search_status correction_search_status NOT NULL DEFAULT 'a_rechercher',
  pedagogical_status       pedagogical_status NOT NULL DEFAULT 'a_rechercher',
  access_tier              access_tier NOT NULL DEFAULT 'premium',
  verification_notes       text,
  UNIQUE (exam_session_id, exercise_type, variant)
);
CREATE INDEX subjects_chapter_idx ON subjects (chapter_id, exercise_type);

CREATE TABLE documents (
  id              text PRIMARY KEY,
  subject_id      text REFERENCES subjects(id),     -- NULL si le document couvre toute l'épreuve
  exam_session_id text REFERENCES exam_sessions(id),
  kind            text NOT NULL,                    -- 'sujet_complet' | 'corrige_officiel' | 'fichier_versailles' | 'texte_officiel'
  title           text,
  original_url    text NOT NULL,
  retrieved_url   text,                             -- URL réellement téléchargée (archive, miroir)
  reference       text,                             -- ex. 'SPIP doc 116', '22-SESJ1ME1C'
  metadata        jsonb NOT NULL DEFAULT '{}',
  accessibility   document_accessibility NOT NULL
);

CREATE TABLE evaluation_grids (
  id                text PRIMARY KEY,
  subject_id        text NOT NULL REFERENCES subjects(id),
  is_official       boolean NOT NULL,               -- false = grille pédagogique éditoriale
  official_reference text,                          -- ex. '22-SESJ1ME1C'
  url               text,
  criteria          jsonb NOT NULL DEFAULT '[]',    -- [{id, label, kind, points?}]
  match_status      grid_match_status NOT NULL,
  match_notes       text
);

CREATE TABLE answers (                              -- corrigés
  id                 text PRIMARY KEY,
  subject_id         text NOT NULL REFERENCES subjects(id),
  version            integer NOT NULL DEFAULT 1,
  content_md         text NOT NULL,
  checklist          jsonb NOT NULL DEFAULT '[]',   -- [{criterion_id, present, location, note}]
  sources            jsonb NOT NULL DEFAULT '[]',
  validation_status  pedagogical_status NOT NULL,
  validated_by_human boolean NOT NULL DEFAULT false,
  last_revised_at    date NOT NULL,
  UNIQUE (subject_id, version)
);

CREATE TABLE external_corrections (                 -- corrigés tiers repérés (référencés, non reproduits)
  id                 text PRIMARY KEY,
  subject_id         text NOT NULL REFERENCES subjects(id),
  url                text NOT NULL,
  author             text,
  published_at       text,
  parts_covered      text,
  limits             text,
  grid_coverage      text,
  reliability        text
);

CREATE TABLE subject_relations (
  subject_a       text NOT NULL REFERENCES subjects(id),
  subject_b       text NOT NULL REFERENCES subjects(id),
  similarity      similarity_type NOT NULL,
  justification   text NOT NULL,
  answer_reuse    text NOT NULL,                    -- décision de réutilisation
  PRIMARY KEY (subject_a, subject_b),
  CHECK (subject_a < subject_b)
);

-- Comptes et droits d'accès (séparés du paiement)
CREATE TABLE accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE,
  account_type  text NOT NULL DEFAULT 'student',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE entitlements (                         -- droits d'accès effectifs
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tier          access_tier NOT NULL,
  source        text NOT NULL,                      -- 'demo' | 'stripe' | 'manual'
  valid_until   timestamptz,
  PRIMARY KEY (account_id, tier, source)
);
CREATE TABLE subscriptions (                        -- état côté prestataire (Stripe), futur
  account_id         uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  provider           text NOT NULL,
  provider_customer  text,
  status             text NOT NULL,
  current_period_end timestamptz
);
-- Fonctionnalités futures (structure prête, non exposée en V1)
CREATE TABLE favorites (account_id uuid REFERENCES accounts(id) ON DELETE CASCADE, subject_id text REFERENCES subjects(id), created_at timestamptz DEFAULT now(), PRIMARY KEY (account_id, subject_id));
CREATE TABLE view_history (account_id uuid REFERENCES accounts(id) ON DELETE CASCADE, subject_id text REFERENCES subjects(id), viewed_at timestamptz DEFAULT now());
CREATE TABLE progress (account_id uuid REFERENCES accounts(id) ON DELETE CASCADE, subject_id text REFERENCES subjects(id), status text NOT NULL, updated_at timestamptz DEFAULT now(), PRIMARY KEY (account_id, subject_id));

-- Données brutes collectées (staging)
CREATE TABLE staging_catalog_entries (
  source        text NOT NULL,                      -- 'versailles-rubrique18' | 'sujetdebac'
  source_key    text NOT NULL,                      -- ex. id SPIP du document
  payload       jsonb NOT NULL,
  collected_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, source_key)                  -- ré-import idempotent (UPSERT)
);

-- Vue publiée : jamais de corrigé premium ici, le contrôle d'accès se fait côté serveur.
CREATE VIEW published_subjects AS
  SELECT s.id, s.slug, s.chapter_id, s.exercise_type, s.question, e.year, e.session, e.center,
         s.access_tier, s.pedagogical_status,
         EXISTS (SELECT 1 FROM answers a WHERE a.subject_id = s.id) AS has_answer,
         EXISTS (SELECT 1 FROM evaluation_grids g WHERE g.subject_id = s.id AND g.is_official
                 AND g.match_status = 'correspondance_verifiee') AS has_verified_official_grid
  FROM subjects s JOIN exam_sessions e ON e.id = s.exam_session_id
  JOIN chapters c ON c.id = s.chapter_id AND c.status = 'published';

COMMIT;
