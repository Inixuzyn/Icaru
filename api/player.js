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
    const { videoId, itag, useProxy = false } = req.body || req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const proxy = "https://cors.caliph.my.id/";
    const url = useProxy ? proxy + "https://www.youtube.com/youtubei/v1/player?prettyPrint=false" 
                         : "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

    const body = {
      context: {
        client: {
          clientName: "ANDROID_VR",
          clientVersion: "1.71.26",
          deviceMake: "Oculus",
          deviceModel: "Quest 3",
          androidSdkVersion: 32,
          osName: "Android",
          osVersion: "12L",
          hl: "en",
          timeZone: "UTC",
          utcOffsetMinutes: 0,
          userAgent: "com.google.android.apps.youtube.vr.oculus/1.71.26 (Android 12L)"
        }
      },
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: "HTML5_PREF_WANTS",
          signatureTimestamp: 20480
        }
      },
      contentCheckOk: true,
      racyCheckOk: true
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Youtube-Client-Name": 3,
        "X-Youtube-Client-Version": "21.02.35",
        Origin: "https://www.youtube.com",
        "Accept-Language": "en-us,en;q=0.5",
        "User-Agent": body.context.client.userAgent
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!data.streamingData) {
      throw new Error('No streaming data found');
    }

    const allFormats = [
      ...(data.streamingData.adaptiveFormats || []),
      ...(data.streamingData.formats || [])
    ];

    const videoDetails = data.videoDetails || {};
    
    let selectedFormat;
    if (itag) {
      selectedFormat = allFormats.find(f => f.itag === Number(itag));
    }

    if (!selectedFormat) {
      selectedFormat = allFormats.find(f => f.qualityLabel?.includes('720p')) ||
                      allFormats.find(f => f.qualityLabel?.includes('360p')) ||
                      allFormats[0];
    }

    // Group formats by type
    const videoFormats = allFormats
      .filter(f => f.mimeType?.includes('video'))
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel || f.quality,
        mimeType: f.mimeType,
        bitrate: f.bitrate,
        contentLength: f.contentLength,
        url: f.url || f.cipher
      }));

    const audioFormats = allFormats
      .filter(f => f.mimeType?.includes('audio'))
      .map(f => ({
        itag: f.itag,
        mimeType: f.mimeType,
        bitrate: f.bitrate,
        contentLength: f.contentLength,
        url: f.url || f.cipher
      }));

    res.status(200).json({
      success: true,
      videoDetails: {
        videoId: videoDetails.videoId,
        title: videoDetails.title,
        author: videoDetails.author,
        lengthSeconds: videoDetails.lengthSeconds,
        thumbnail: videoDetails.thumbnail?.thumbnails || [],
        keywords: videoDetails.keywords || [],
        shortDescription: videoDetails.shortDescription
      },
      selectedFormat: selectedFormat ? {
        itag: selectedFormat.itag,
        quality: selectedFormat.qualityLabel || selectedFormat.quality,
        mimeType: selectedFormat.mimeType,
        contentLength: selectedFormat.contentLength,
        url: selectedFormat.url || selectedFormat.cipher
      } : null,
      availableFormats: {
        video: videoFormats,
        audio: audioFormats
      },
      totalFormats: allFormats.length
    });

  } catch (error) {
    console.error('Player error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get player info'
    });
  }
};
