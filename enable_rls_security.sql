-- ====================================================================
-- STARTELEC — SÉCURISATION RLS SANS AUCUNE PERTE DE DONNÉES
-- À exécuter dans l'onglet "SQL Editor" de votre console Supabase.
-- Aucune table ni ligne n'est supprimée.
-- ====================================================================

-- 1. Réactiver la sécurité RLS sur les tables chantiers, tâches et travaux supplémentaires
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches_chantier ENABLE ROW LEVEL SECURITY;
ALTER TABLE travaux_supp ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques trop permissives (accès public sans connexion)
DROP POLICY IF EXISTS "public_all_chantiers" ON chantiers;
DROP POLICY IF EXISTS "public_all_taches" ON taches_chantier;
DROP POLICY IF EXISTS "public_all_ts" ON travaux_supp;

-- 3. Autoriser uniquement l'administrateur connecté (rôle authenticated)
-- Les clients continuent d'accéder à leurs données via les fonctions RPC SECURITY DEFINER
DROP POLICY IF EXISTS "Admin full access chantiers" ON chantiers;
CREATE POLICY "Admin full access chantiers" ON chantiers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access taches" ON taches_chantier;
CREATE POLICY "Admin full access taches" ON taches_chantier
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access travaux_supp" ON travaux_supp;
CREATE POLICY "Admin full access travaux_supp" ON travaux_supp
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

