const NEWS_API_KEY = (process.env.NEWS_API_KEY || DEFAULT_NEWS_API_KEY).trim();
const CACHE_TTL_MS = Number(process.env.CRIME_NEWS_CACHE_TTL_MS || 5 * 60 * 1000);
const NEWS_API_URL = 'https://newsapi.org/v2/everything';
const NEWS_QUERY = '(Nigeria OR Nigerian OR Lagos OR Abuja OR Port Harcourt OR Kano) AND (crime OR robbery OR kidnapping OR banditry OR fraud OR cult OR police arrest)';

const nigeriaTerms = [
    'nigeria',
    'nigerian',
    'lagos',
    'abuja',
    'port harcourt',
    'rivers state',
    'kano',
    'kaduna',
    'ibadan',
    'enugu',
    'anambra',
    'edo',
    'delta state'
];

const crimeTerms = [
    'crime',
    'robbery',
    'armed robbery',
    'kidnap',
    'kidnapping',
    'fraud',
    'bandit',
    'banditry',
    'cult',
    'cultism',
    'police arrest',
    'arrested',
    'stolen',
    'theft',
    'murder',
    'homicide',
    'assault',
    'abduction',
    'security breach'
];

let cachedPayload = null;
let cachedAt = 0;

function hasTermMatch(text, terms) {
    return terms.some((term) => text.includes(term));
}

function normalizeArticle(article) {
    return {
        title: String(article.title || '').trim(),
        description: String(article.description || '').trim(),
        url: String(article.url || '').trim(),
        imageUrl: String(article.urlToImage || '').trim(),
        source: String(article.source?.name || 'Unknown source').trim(),
        publishedAt: article.publishedAt || null
    };
}

function filterCrimeArticles(articles) {
    const seen = new Set();

    return articles
        .map(normalizeArticle)
        .filter((article) => article.title && article.url)
        .filter((article) => {
            const haystack = `${article.title} ${article.description}`.toLowerCase();
            return hasTermMatch(haystack, nigeriaTerms) && hasTermMatch(haystack, crimeTerms);
        })
        .filter((article) => {
            if (seen.has(article.url)) {
                return false;
            }
            seen.add(article.url);
            return true;
        })
        .slice(0, 12);
}

export async function getCrimeNews() {
    if (!NEWS_API_KEY) {
        throw new Error('News API key is not configured.');
    }

    const now = Date.now();
    if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
        return cachedPayload;
    }

    const url = new URL(NEWS_API_URL);
    url.searchParams.set('q', NEWS_QUERY);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '25');
    url.searchParams.set('searchIn', 'title,description');

    const response = await fetch(url, {
        headers: {
            'X-Api-Key': NEWS_API_KEY
        }
    });

    if (!response.ok) {
        let errorBody = '';
        try {
            errorBody = await response.text();
        } catch (_) {
            errorBody = '';
        }
        throw new Error(`NewsAPI request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const articles = filterCrimeArticles(Array.isArray(data.articles) ? data.articles : []);

    cachedPayload = {
        ok: true,
        region: 'Nigeria',
        topic: 'Crime',
        fetchedAt: new Date().toISOString(),
        refreshIntervalMs: CACHE_TTL_MS,
        total: articles.length,
        articles
    };
    cachedAt = now;

    return cachedPayload;
}
