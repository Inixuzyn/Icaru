const { fetch } = require('undici');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url, useProxy = false, range } = req.body || req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const proxy = "https://cors.caliph.my.id/";
    const targetUrl = useProxy ? proxy + url : url;

    const headers = {};
    if (range) {
      headers.Range = `bytes=${range}`;
    }

    const response = await fetch(targetUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length') || buffer.byteLength;

    // Untuk download langsung
    if (req.query.direct === 'true') {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', 'attachment; filename="download"');
      res.send(Buffer.from(buffer));
      return;
    }

    // Untuk info download
    res.status(200).json({
      success: true,
      contentLength: parseInt(contentLength),
      contentType,
      url: targetUrl,
      estimatedSizeMB: (parseInt(contentLength) / (1024 * 1024)).toFixed(2)
    });

  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Download failed'
    });
  }
};
