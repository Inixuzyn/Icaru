const axios = require('axios');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query, limit = 20 } = req.body || req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const headers = {
      "content-type": "application/json",
      "x-youtube-client-name": "2",
      "x-youtube-client-version": "2.20260128.05.00",
      "x-origin": "https://m.youtube.com"
    };

    const body = {
      "context": {
        "client": {
          "hl": "en",
          "gl": "ID",
          "clientName": "MWEB",
          "clientVersion": "2.20260128.05.00",
          "platform": "MOBILE"
        }
      },
      "query": query
    };

    const { data } = await axios.post(
      "https://m.youtube.com/youtubei/v1/search?prettyPrint=false",
      body,
      { headers }
    );

    const out = [];
    const sections = data?.contents?.sectionListRenderer?.contents ?? [];

    for (const s of sections) {
      const items = s?.itemSectionRenderer?.contents ?? [];
      for (const i of items) {
        if (out.length >= limit) break;
        
        const v = i.videoWithContextRenderer || i.videoRenderer || i.compactVideoRenderer;
        if (!v?.videoId) continue;

        const t = v.thumbnail?.thumbnails ?? [];
        out.push({
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || v.headline?.runs?.[0]?.text || null,
          author: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || null,
          views: v.viewCountText?.simpleText || v.shortViewCountText?.runs?.[0]?.text || null,
          ago: v.publishedTimeText?.simpleText || v.publishedTimeText?.runs?.[0]?.text || null,
          duration: v.lengthText?.simpleText || null,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnailUrl: t.at(-1)?.url ?? null
        });
      }
      if (out.length >= limit) break;
    }

    res.status(200).json({
      success: true,
      query,
      results: out,
      count: out.length
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to search videos'
    });
  }
};
