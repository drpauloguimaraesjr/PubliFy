/**
 * Importa artigos_encontrados.json para Firestore collection 'articles'.
 * Desnormaliza: cada artigo vira 1 documento Firestore com campo 'themes' (temas associados).
 * Roda 1 vez. Pode re-rodar — usa pmid como ID (idempotente).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { init, db } = require('../src/services/firebase');

const SOURCE = path.join(
  'g:', 'Meu Drive', 'ANTIGRAVITY', 'ipagent', 'data', 'dataset_finetunning', 'json', 'artigos_encontrados.json'
);

async function run() {
  init();
  const firestore = db();
  const raw = JSON.parse(fs.readFileSync(SOURCE, 'utf-8'));

  const articlesMap = new Map();

  for (const item of raw) {
    const theme = item.tema_principal || '';
    const terms = item.termos || [];
    const artigos = item.artigos || {};

    for (const src of ['pubmed', 'semantic', 'trials']) {
      const list = artigos[src];
      if (!Array.isArray(list)) continue;

      for (const a of list) {
        const id = String(a.pmid || a.nctId || '').trim();
        if (!id) continue;

        if (articlesMap.has(id)) {
          const existing = articlesMap.get(id);
          if (!existing.themes.includes(theme)) existing.themes.push(theme);
          for (const t of terms) {
            if (!existing.terms.includes(t)) existing.terms.push(t);
          }
        } else {
          articlesMap.set(id, {
            pmid: id,
            title: a.titulo || '',
            authors: a.autores || '',
            year: String(a.ano || ''),
            journal: a.journal || '',
            abstract: (a.abstract || '').substring(0, 2000),
            url: a.url || '',
            source: a.fonte || src,
            themes: [theme],
            terms: [...terms],
          });
        }
      }
    }
  }

  console.log(`Parsed ${articlesMap.size} unique articles from ${raw.length} themes.`);

  const batch_size = 400;
  const entries = [...articlesMap.values()];
  let written = 0;

  for (let i = 0; i < entries.length; i += batch_size) {
    const batch = firestore.batch();
    const slice = entries.slice(i, i + batch_size);

    for (const art of slice) {
      const ref = firestore.collection('articles').doc(art.pmid);
      batch.set(ref, art, { merge: true });
    }

    await batch.commit();
    written += slice.length;
    console.log(`  batch ${Math.ceil((i + 1) / batch_size)}: ${written}/${entries.length}`);
  }

  console.log(`\nDone. ${written} articles written to Firestore collection 'articles'.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
