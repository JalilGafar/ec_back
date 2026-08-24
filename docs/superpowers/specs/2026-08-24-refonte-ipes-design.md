# Refonte des IPES — harmonisation base de données vs répertoires officiels MINESUP

Date : 2026-08-24
Base concernée : `c2154511c_ecolecamerdb` (production, `nodeapp.camerdiplome.com`)

## 1. Contexte et objectif

L'utilisateur dispose de documents officiels MINESUP :
- Un document **Annexe** (Répertoire des IPES, Édition 2022, pp. 333-339) qui contient la table de correspondance **ancienne → nouvelle nomenclature** des filières/spécialités BTS/DSEP (arrêté N°17/00224/MINESUP/DDES du 24/10/2017) et HND/HPD (arrêté N°18-00866/MINESUP du 02/11/2018).
- Des documents **régionaux** (un par région du Cameroun, ex. "Région du Nord") qui listent, pour chaque IPES, sa dénomination, ses références de création/ouverture, sa localisation, et l'intégralité de ses filières/spécialités officiellement reconnues (BTS, et le cas échéant Licence Pro/Master Pro sous tutelle académique d'une université publique).

Objectif : faire en sorte que chaque école de la base déjà couverte par un document régional ne présente **que** les diplômes/formations de niveau MINESUP (BTS, DSEP, DUT, HND, Bachelor, Licence, Licence Pro, BUT, Ingénieur, Master, Master Pro, Doctorat, MBA) qui figurent dans le document officiel — ni plus, ni moins — tout en enrichissant les métadonnées de l'école (arrêtés, contact, direction) et en fiabilisant le lien école↔campus↔ville.

Les diplômes hors tutelle MINESUP enseignement supérieur (CQP, DQP, DTS, BQP, Certification Internationale, Formation Qualifiante, Attestation de Formation, Bac Pro, CAP...) ne sont jamais impactés par cette purge, même absents du document.

## 2. Découvertes techniques préalables (schéma prod)

- `formations` (lien école↔diplôme, `id_form`) peut être supprimée sans casser aucune contrainte — aucune FK ne référence `id_form`. C'est l'unité de suppression sûre.
- `diplomes.nom_dip` est **UNIQUE** et partagé entre écoles. `DELETE FROM diplomes` met `formations.diplom_id` et `avis.diplo_id` à `NULL` (ON DELETE SET NULL) — donc on ne supprime un diplôme du catalogue que s'il devient réellement orphelin (plus aucune `formations` ne le référence), jamais en réaction au retrait d'une seule école.
- `filiere_dip` est souvent `NULL` en base (notamment Licence Pro/Master Pro) — le rapprochement avec le document se fait donc principalement sur le nom de spécialité (`nom_dip`), pas sur `filiere_dip`.
- Les sigles ne sont pas des identifiants fiables à 100% (ex. document "ISSI" = Institut Supérieur Septentrion **Informatique** ≠ base "ISSEG" = Institut Supérieur Septentrion **de Garoua**, deux établissements distincts). D'où la nécessité d'un rapprochement à validation humaine.
- `categories.groupe` distingue déjà les niveaux MINESUP (`Bac+1 à Bac+2`, `Bac+3`, `Bac+4 à Bac+5`, `Bac+6 et plus`) des niveaux hors périmètre (`Autre`, `CAP ou équivalent`, `Bac ou équivalent`). `DTS` est déjà classé dans `Autre`.
- `campus.ville_cam` compte actuellement ~40 valeurs distinctes, déjà propres (pas de doublon orthographique constaté). Certaines écoles sont légitimement multi-campus dans plusieurs villes (ex. réseau sur 5 villes) — un écart ville document/base n'est donc pas automatiquement une erreur à corriger par écrasement.
- 6 écoles n'ont actuellement aucun campus lié.

## 3. Pipeline, région par région, école par école

Répertoire de travail : `ec_back/scripts/refonte_ipes/`.

### Phase A — Référentiel de nomenclature (une fois, réutilisé pour toutes les régions)
Transcription du document Annexe en `annexe_nomenclature.json` : mapping ancienne dénomination → nouvelle dénomination officielle, par filière/spécialité (BTS/DSEP français + HND anglais). Sert de normalisation lors du rapprochement : toute spécialité d'une école qui correspond à une ancienne dénomination est comparée/écrite sous sa nouvelle dénomination officielle.

### Phase B — Extraction régionale
Transcription manuelle du document régional en `<region>_source.json` :
```json
{
  "region": "Nord",
  "ecoles": [
    {
      "denomination": "...",
      "promoteur": "...",
      "sigle": "...",
      "ville": "Garoua",
      "localisation_precise": "Ngong",
      "bp": "...",
      "tel": "...",
      "accord_creation": { "numero": "...", "date": "2021-03-26" },
      "autorisation_ouverture": { "numero": "...", "date": "2021-03-26" },
      "filieres": [
        { "niveau": "BTS", "filiere": "Agriculture et Elevage", "specialites": ["Production Animale", "..."] }
      ],
      "partenariats_academiques": [
        { "niveau": "Licence et Master professionnels", "universite_tutelle": "Université de Ngaoundéré", "filiere": "...", "specialites": ["..."] }
      ]
    }
  ]
}
```

### Phase C — Rapprochement école (validation globale région)
Pour chaque école du JSON, recherche dans `ecoles` par `sigle_e` puis `nom_e` (comparaison normalisée : casse/accents/espaces). Classement :
- **MATCHED** — correspondance fiable unique.
- **AMBIGU** — plusieurs candidats ou similarité faible ; soumis à l'utilisateur pour arbitrage avant de continuer.
- **NON_TROUVÉE** — aucune correspondance ; école à créer.

Rapport `<region>_matching_report.json` présenté et validé avant la suite. Les AMBIGU tranchées par l'utilisateur rejoignent le flux MATCHED.

### Phase D — Traitement école par école (une validation par école, jamais de lot)
Pour chaque école (MATCHED, AMBIGU tranchée, ou NON_TROUVÉE), un rapport `<region>_<ecole>_diff.json` est généré puis soumis à validation avant toute écriture :

1. **Diff formations** (périmètre MINESUP uniquement, cf. §2) :
   - présentes en base, absentes du document → candidates suppression (`DELETE FROM formations`)
   - présentes dans le document, absentes de la base → candidates ajout (création du diplôme catalogue si besoin, puis `INSERT INTO formations`)
   - présentes des deux côtés → inchangées
2. **Diff métadonnées école** (avant/après) : `arrete_creation`, `arrete_ouverture`, `date_creation` (année de l'accord), `tel_1_e`, `directeur_e`.
3. **Vérification campus/ville** :
   - École NON_TROUVÉE → création école + campus (ville normalisée contre la liste canonique existante).
   - Campus déjà lié avec la bonne ville → rien à signaler.
   - Campus lié à une ville différente de celle du document → **signalé sans action automatique** ; l'utilisateur tranche entre (a) correction (délier l'ancienne, lier/créer la bonne) si c'est une erreur de géoloc, ou (b) ajout de la ville du document comme site supplémentaire si l'école est réellement multi-campus.

Exécution uniquement après validation explicite, école par école. Renommage de nomenclature (Annexe) sur `diplomes.nom_dip` traité comme une écriture à impact catalogue global, signalée séparément lors de la validation.

### Phase E — Sauvegarde
Avant toute écriture sur une région, dump SQL des tables `ecoles`, `campus`, `campus_ecoles`, `diplomes`, `formations`, `domaines_diplomes`, horodaté dans `scripts/refonte_ipes/backups/`.

## 4. Conventions de fichiers

```
ec_back/scripts/refonte_ipes/
  annexe_nomenclature.json
  <region>_source.json
  <region>_matching_report.json
  <region>_<ecole>_diff.json
  backups/<region>_<timestamp>.sql
```

Aucun credential en clair committé — les scripts de connexion à la prod restent locaux/temporaires et sont supprimés après usage (comme pratiqué depuis le début de ce chantier).

## 5. Cadence

Une région à la fois (démarrage : région du Nord), une école à la fois au sein d'une région. Aucun INSERT/UPDATE/DELETE n'est exécuté sans validation explicite de l'étape concernée, conformément à la pratique déjà établie sur ce projet.

## 6. Hors périmètre (rappel)

- Diplômes non régulés par le MINESUP enseignement supérieur (`categories.groupe IN ('Autre', 'CAP ou équivalent', 'Bac ou équivalent')`) — jamais touchés.
- Écoles non couvertes par un document régional — non concernées par ce chantier.
- Le texte réglementaire sur les Classes Préparatoires (CPGE, pp. 337-339 de l'Annexe) — hors périmètre de cette refonte (aucune donnée de correspondance à exploiter).
