const { db } = require('./firebase');

const COLLECTION = 'articles';

async function searchArticles(query, limit = 5) {
  const firestore = db();
  const terms = extractSearchTerms(query);
  if (!terms.length) return [];

  const candidates = new Map();

  for (const term of terms.slice(0, 6)) {
    const snap = await firestore
      .collection(COLLECTION)
      .where('terms', 'array-contains', term)
      .limit(20)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (candidates.has(doc.id)) {
        candidates.get(doc.id).score += 1;
      } else {
        candidates.set(doc.id, {
          score: 1,
          pmid: data.pmid,
          title: data.title,
          authors: data.authors,
          year: data.year,
          journal: data.journal,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
        });
      }
    }
  }

  const titleLower = query.toLowerCase();
  const snap2 = await firestore.collection(COLLECTION).limit(200).get();
  for (const doc of snap2.docs) {
    const data = doc.data();
    const relevance = scoreByText(data, titleLower);
    if (relevance > 0) {
      if (candidates.has(doc.id)) {
        candidates.get(doc.id).score += relevance;
      } else {
        candidates.set(doc.id, {
          score: relevance,
          pmid: data.pmid,
          title: data.title,
          authors: data.authors,
          year: data.year,
          journal: data.journal,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
        });
      }
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function extractSearchTerms(query) {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'not', 'but',
    'have', 'has', 'can', 'what', 'how', 'does', 'will',
    'de', 'da', 'do', 'em', 'com', 'para', 'por', 'uma', 'que', 'os', 'as', 'no', 'na',
    'se', 'ao', 'ou', 'um', 'dos', 'das', 'mais', 'tem', 'ser', 'ter', 'sobre',
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõöúüç\s-]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))
    .slice(0, 10);
}

function scoreByText(article, queryLower) {
  let score = 0;
  const title = (article.title || '').toLowerCase();
  const abstract = (article.abstract || '').toLowerCase();
  const themes = (article.themes || []).map(t => t.toLowerCase());

  const words = queryLower.split(/\s+/).filter(w => w.length > 3);
  for (const w of words) {
    if (title.includes(w)) score += 3;
    if (abstract.includes(w)) score += 1;
    for (const th of themes) {
      if (th.includes(w)) score += 2;
    }
  }
  return score;
}

function formatReferencesForPrompt(articles) {
  if (!articles.length) return '';

  const header = `\n\n# REFERÊNCIAS VERIFICADAS (use SOMENTE estas — NÃO invente outras)\n`;
  const refs = articles.map((a, i) =>
    `[${i + 1}] ${a.authors}. "${a.title}". ${a.journal} ${a.year}. PMID: ${a.pmid}\n    URL: ${a.url}\n    Resumo: ${a.abstract?.substring(0, 300)}...`
  ).join('\n\n');

  return header + refs + '\n\nIMPORTANTE: cite SOMENTE as referências acima. Se nenhuma for relevante ao tema, diga "sem referência verificada" — nunca invente.';
}

module.exports = { searchArticles, formatReferencesForPrompt };
