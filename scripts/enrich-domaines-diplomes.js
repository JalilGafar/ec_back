/**
 * enrich-domaines-diplomes.js
 *
 * Associe intelligemment chaque diplôme à ses domaines via l'API Google Gemini (gratuit).
 *
 * Pré-requis : ajouter GEMINI_API_KEY=AIzaSy... dans .env
 * Clé gratuite sur https://aistudio.google.com/app/apikey
 *
 * Usage :
 *   node scripts/enrich-domaines-diplomes.js --dry-run [--limit=N] [--id=N]
 *   node scripts/enrich-domaines-diplomes.js --execute  [--limit=N] [--id=N]
 */

'use strict';

const path = require('path');

// Charge .env depuis ec_back/ quel que soit le répertoire d'exécution
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql2 = require('mysql2/promise');
const fs = require('fs');
const https = require('https');

// ─── Configuration ────────────────────────────────────────────────────────────

const BATCH_SIZE    = 20;
const DELAY_MS      = 1000;
const MAX_RETRIES   = 3;
const API_TIMEOUT   = 30_000;
const GEMINI_MODEL  = 'gemini-2.0-flash';
const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const LOGS_DIR       = path.join(__dirname, 'logs');
const SQL_FILE       = path.join(MIGRATIONS_DIR, '005_enrich_domaines_diplomes.sql');
const LOW_CONF_FILE  = path.join(LOGS_DIR, 'enrich-low-confidence.json');
const FAILED_FILE    = path.join(LOGS_DIR, 'enrich-failed-batches.json');

// ─── Argument parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun  = args.includes('--dry-run');
const isExecute = args.includes('--execute');
const limitArg  = args.find(a => a.startsWith('--limit='));
const idArg     = args.find(a => a.startsWith('--id='));
const LIMIT     = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const SINGLE_ID = idArg   ? parseInt(idArg.split('=')[1], 10)    : null;

if (!isDryRun && !isExecute) {
  console.error('Erreur : spécifier --dry-run ou --execute');
  process.exit(1);
}
if (isDryRun && isExecute) {
  console.error('Erreur : --dry-run et --execute sont mutuellement exclusifs');
  process.exit(1);
}

// ─── Database pool ───────────────────────────────────────────────────────────

function createPool() {
  return mysql2.createPool({
    host            : process.env.DB_HOST,
    user            : process.env.DB_USER,
    password        : process.env.DB_PASSWORD,
    database        : process.env.DB_NAME,
    port            : parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit : 5,
    queueLimit      : 0,
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function ensureDirs() {
  [MIGRATIONS_DIR, LOGS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function progressBar(done, total, label = '') {
  const width = 40;
  const pct   = total === 0 ? 1 : done / total;
  const filled = Math.round(width * pct);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`\r[${bar}] ${done}/${total} ${label}   `);
}

// ─── Google Gemini API call (native https, gratuit) ─────────────────────────

function callGemini(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reject(new Error('GEMINI_API_KEY absent du fichier .env — voir https://aistudio.google.com/app/apikey'));
    }

    const body = Buffer.from(JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature     : 0,
        maxOutputTokens : 2000,
        responseMimeType: 'application/json',
      },
    }));

    const url     = new URL(`${GEMINI_URL}?key=${apiKey}`);
    const options = {
      hostname: url.hostname,
      path    : url.pathname + url.search,
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode === 503) {
          // Extraire le message d'erreur Google pour faciliter le diagnostic
          let detail = '';
          try { detail = JSON.parse(raw).error?.message || ''; } catch (_) {}
          const retryAfter = parseInt(res.headers['retry-after'] || '0', 10);
          const err = Object.assign(
            new Error(`rate_limit HTTP ${res.statusCode}${detail ? ': ' + detail : ''}`),
            { retryable: true, statusCode: res.statusCode, retryAfter }
          );
          return reject(err);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`API HTTP ${res.statusCode}: ${raw.slice(0, 400)}`));
        }
        try {
          const parsed = JSON.parse(raw);
          const text   = parsed.candidates[0].content.parts[0].text;
          resolve(text);
        } catch (e) {
          reject(new Error(`Impossible de parser la réponse Gemini: ${raw.slice(0, 300)}`));
        }
      });
    });

    req.setTimeout(API_TIMEOUT, () => {
      req.destroy(Object.assign(new Error('timeout'), { retryable: true }));
    });

    req.on('error', err => reject(err));
    req.write(body);
    req.end();
  });
}

async function callGeminiWithRetry(systemPrompt, userPrompt) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGemini(systemPrompt, userPrompt);
    } catch (err) {
      if (err.retryable && attempt < MAX_RETRIES) {
        const wait = attempt * 3000;
        console.log(`\n  ⚠ Tentative ${attempt}/${MAX_RETRIES} échouée (${err.message}), retry dans ${wait / 1000}s...`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en système éducatif camerounais et en orientation scolaire.
Tu dois associer des diplômes à des domaines d'études de manière précise et exhaustive.
Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans balises markdown.`;

function buildUserPrompt(domaines, diplomesBatch) {
  const domainesJson = JSON.stringify(
    domaines.map(d => ({ id_dom: d.id_dom, nom_dom: d.nom_dom, branche_dom: d.branche_dom }))
  );
  const diplomesJson = JSON.stringify(
    diplomesBatch.map(d => ({
      id_dip       : d.id_dip,
      nom_dip      : d.nom_dip,
      filiere_dip  : d.filiere_dip,
      descriptif_dip: d.descriptif_dip ? d.descriptif_dip.slice(0, 400) : '',
      debouches_dip : d.debouches_dip  ? d.debouches_dip.slice(0, 300)  : '',
      niveau        : d.niveau,
      nom_cat       : d.nom_cat,
      groupe        : d.groupe,
    }))
  );

  return `Voici la liste complète des domaines disponibles :
${domainesJson}

Pour chacun des diplômes suivants, retourne les IDs des domaines pertinents.
Règles :
- Associe TOUS les domaines réellement couverts par le diplôme (pas de limite)
- Minimum 1 domaine, maximum 8 domaines par diplôme
- Base-toi sur le nom, la filière, le descriptif et les débouchés
- Tiens compte du contexte camerounais (système anglophone/francophone, secteurs locaux)
- Si le descriptif est vide, infère à partir du nom et de la filière uniquement

Diplômes à traiter :
${diplomesJson}

Format de réponse attendu (tableau d'objets, un par diplôme) :
[
  {
    "id_dip": 42,
    "domaines_ids": [3, 7, 12],
    "confiance": "haute|moyenne|basse",
    "note": "courte justification si confiance basse"
  }
]`;
}

// ─── Database queries ────────────────────────────────────────────────────────

async function loadDomaines(pool) {
  const [rows] = await pool.query(
    'SELECT id_dom, nom_dom, branche_dom FROM domaines ORDER BY id_dom'
  );
  return rows;
}

async function loadDiplomes(pool) {
  let query = `
    SELECT d.id_dip, d.nom_dip, d.filiere_dip, d.descriptif_dip, d.debouches_dip,
           d.niveau, c.nom_cat, c.groupe
    FROM   diplomes d
    LEFT JOIN categories c ON c.id_cat = d.categorie_id
  `;
  const params = [];

  if (SINGLE_ID) {
    query += ' WHERE d.id_dip = ?';
    params.push(SINGLE_ID);
  }

  query += ' ORDER BY d.id_dip';

  if (LIMIT && !SINGLE_ID) {
    query += ' LIMIT ?';
    params.push(LIMIT);
  }

  const [rows] = await pool.query(query, params);
  return rows;
}

async function loadExistingAssociations(pool, diplomeIds) {
  if (diplomeIds.length === 0) return new Map();
  const placeholders = diplomeIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT domaines_id, diplomes_id FROM domaines_diplomes WHERE diplomes_id IN (${placeholders})`,
    diplomeIds
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.diplomes_id)) map.set(row.diplomes_id, new Set());
    map.get(row.diplomes_id).add(row.domaines_id);
  }
  return map;
}

async function insertAssociations(pool, inserts) {
  if (inserts.length === 0) return;
  const values = inserts.map(([domId, dipId]) => `(${domId}, ${dipId})`).join(',\n  ');
  await pool.query(
    `INSERT IGNORE INTO domaines_diplomes (domaines_id, diplomes_id) VALUES\n  ${values}`
  );
}

// ─── Result validation & filtering ──────────────────────────────────────────

function validateAndFilter(apiResults, domaineIds, existingAssoc) {
  const newInserts  = [];
  const lowConfList = [];

  for (const item of apiResults) {
    const dipId = item.id_dip;
    const existing = existingAssoc.get(dipId) || new Set();

    const validDomIds = (item.domaines_ids || []).filter(id => domaineIds.has(id));
    const freshIds    = validDomIds.filter(id => !existing.has(id));

    for (const domId of freshIds) {
      newInserts.push([domId, dipId]);
    }

    if (item.confiance === 'basse') {
      lowConfList.push({
        id_dip      : dipId,
        domaines_ids: validDomIds,
        note        : item.note || '',
      });
    }
  }

  return { newInserts, lowConfList };
}

// ─── SQL generation ──────────────────────────────────────────────────────────

function generateSQL(allInserts, stats) {
  const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const header = `-- Migration 005 : Enrichissement domaines_diplomes par IA
-- Générée le : ${date}
-- Diplômes traités : ${stats.totalDiplomes}
-- Nouvelles associations : ${allInserts.length}
-- Associations à confiance basse (à vérifier) : ${stats.lowConfCount}
-- Exécuter après vérification humaine sur l'échantillon
`;

  if (allInserts.length === 0) {
    return header + '\n-- Aucune nouvelle association à insérer.\n';
  }

  const values = allInserts.map(([domId, dipId]) => `  (${domId}, ${dipId})`).join(',\n');
  return `${header}
INSERT IGNORE INTO domaines_diplomes (domaines_id, diplomes_id) VALUES
${values}
;
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  const pool = createPool();
  const startTime = Date.now();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Camerdiplome — Enrichissement domaines_diplomes via Gemini');
  console.log(`  Mode : ${isDryRun ? 'DRY-RUN (SQL généré, rien écrit en base)' : 'EXECUTE (écriture directe en base)'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Load reference data
  console.log('📥 Chargement des domaines...');
  const domaines   = await loadDomaines(pool);
  const domaineIds = new Set(domaines.map(d => d.id_dom));
  console.log(`   → ${domaines.length} domaines chargés`);

  console.log('📥 Chargement des diplômes...');
  const diplomes = await loadDiplomes(pool);
  console.log(`   → ${diplomes.length} diplômes chargés\n`);

  if (diplomes.length === 0) {
    console.log('Aucun diplôme à traiter. Fin.');
    await pool.end();
    return;
  }

  // 2. Slice into batches
  const batches = [];
  for (let i = 0; i < diplomes.length; i += BATCH_SIZE) {
    batches.push(diplomes.slice(i, i + BATCH_SIZE));
  }

  console.log(`🔄 ${batches.length} batch(es) de ${BATCH_SIZE} diplômes à traiter\n`);

  const allInserts      = [];
  const allLowConf      = [];
  const failedBatches   = [];
  let   batchesDone     = 0;

  for (const batch of batches) {
    const dipIds = batch.map(d => d.id_dip);

    // Load existing associations for this batch
    const existingAssoc = await loadExistingAssociations(pool, dipIds);

    const systemPrompt = SYSTEM_PROMPT;
    const userPrompt   = buildUserPrompt(domaines, batch);

    let apiResults = null;
    try {
      const rawText = await callGeminiWithRetry(systemPrompt, userPrompt);

      // Strip potential markdown fences just in case
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      apiResults = JSON.parse(cleaned);

      if (!Array.isArray(apiResults)) throw new Error('La réponse API n\'est pas un tableau');
    } catch (err) {
      console.error(`\n  ✗ Batch [${dipIds[0]}..${dipIds[dipIds.length - 1]}] échoué : ${err.message}`);
      failedBatches.push({ dipIds, error: err.message });
      batchesDone++;
      progressBar(batchesDone, batches.length, `batch ${batchesDone}/${batches.length}`);
      continue;
    }

    const { newInserts, lowConfList } = validateAndFilter(apiResults, domaineIds, existingAssoc);

    allInserts.push(...newInserts);
    allLowConf.push(...lowConfList);

    if (isExecute && newInserts.length > 0) {
      try {
        await insertAssociations(pool, newInserts);
      } catch (err) {
        console.error(`\n  ✗ INSERT échoué pour batch [${dipIds[0]}..${dipIds[dipIds.length - 1]}] : ${err.message}`);
        failedBatches.push({ dipIds, error: err.message });
      }
    }

    batchesDone++;
    progressBar(batchesDone, batches.length, `batch ${batchesDone}/${batches.length} (+${newInserts.length} assoc.)`);

    // Pause between API calls (skip after last batch)
    if (batchesDone < batches.length) await sleep(DELAY_MS);
  }

  process.stdout.write('\n\n');

  // 3. Write logs
  if (allLowConf.length > 0) {
    fs.writeFileSync(LOW_CONF_FILE, JSON.stringify(allLowConf, null, 2), 'utf8');
  }
  if (failedBatches.length > 0) {
    fs.writeFileSync(FAILED_FILE, JSON.stringify(failedBatches, null, 2), 'utf8');
  }

  // 4. Generate SQL file (always)
  const stats = {
    totalDiplomes: diplomes.length,
    lowConfCount : allLowConf.length,
  };
  const sql = generateSQL(allInserts, stats);
  fs.writeFileSync(SQL_FILE, sql, 'utf8');
  console.log(`📄 SQL généré : ${SQL_FILE}`);

  // 5. Final summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`  ✓ Diplômes traités        : ${diplomes.length}`);
  console.log(`  ✓ Nouvelles associations  : ${allInserts.length}`);
  console.log(`  ⚠ Confiance basse         : ${allLowConf.length}${allLowConf.length > 0 ? `  (voir ${LOW_CONF_FILE})` : ''}`);
  console.log(`  ✗ Batches échoués         : ${failedBatches.length}${failedBatches.length > 0 ? `  (voir ${FAILED_FILE})` : ''}`);
  console.log(`  ⏱ Durée totale            : ${minutes}m ${seconds}s`);
  if (isDryRun) {
    console.log('\n  → Mode dry-run : aucune écriture en base. Vérifiez le fichier SQL');
    console.log(`    puis relancez avec --execute pour appliquer.`);
  }
  console.log('─────────────────────────────────────────────────────────\n');

  await pool.end();
}

main().catch(err => {
  console.error('\n✗ Erreur fatale :', err.message);
  process.exit(1);
});
