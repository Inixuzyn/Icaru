class YouTubeApp {
    constructor() {
        this.apiBase = '/api';
        this.currentResults = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSearchHistory();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.search());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });

        // Modal functionality
        document.getElementById('apiDocsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showApiDocs();
        });

        document.getElementById('aboutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAbout();
        });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.getElementById('closePreview').addEventListener('click', () => {
            document.getElementById('playerPreview').style.display = 'none';
        });

        // Close modal on outside click
        document.getElementById('apiModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
    }

    async search() {
        const query = document.getElementById('searchInput').value.trim();
        const limit = document.getElementById('limitInput').value;
        const useProxy = document.getElementById('useProxy').checked;

        if (!query) {
            this.showNotification('Please enter a search term', 'error');
            return;
        }

        this.showLoading(true);
        this.saveSearchHistory(query);

        try {
            const response = await fetch(`${this.apiBase}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, limit, useProxy })
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data.results);
                this.showNotification(`Found ${data.results.length} videos`, 'success');
            } else {
                throw new Error(data.message || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification(error.message, 'error');
            this.displayResults([]);
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(videos) {
        this.currentResults = videos;
        const container = document.getElementById('resultsContainer');
        const countElement = document.getElementById('resultCount');

        countElement.textContent = `${videos.length} results`;

        if (videos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>No videos found</h3>
                    <p>Try a different search term</p>
                </div>
            `;
            return;
        }

        container.innerHTML = videos.map(video => this.createVideoCard(video)).join('');
        
        // Add event listeners to all video cards
        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    const videoId = card.dataset.videoId;
                    this.showPlayer(videoId);
                }
            });
        });
    }

    createVideoCard(video) {
        return `
            <div class="video-card" data-video-id="${video.videoId}">
                <div class="video-thumbnail">
                    ${video.thumbnailUrl ? 
                        `<img src="${video.thumbnailUrl}" alt="${video.title}" loading="lazy">` : 
                        `<div style="background: #333; height: 100%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-video" style="font-size: 2rem; color: #666;"></i>
                        </div>`
                    }
                    ${video.duration ? `<span class="duration-badge">${video.duration}</span>` : ''}
                </div>
                <div class="video-info">
                    <h3 class="video-title" title="${video.title || 'No title'}">
                        ${video.title || 'No title available'}
                    </h3>
                    <div class="video-meta">
                        <span class="video-author">
                            <i class="fas fa-user"></i> ${video.author || 'Unknown'}
                        </span>
                        <span class="video-views">
                            <i class="fas fa-eye"></i> ${video.views || 'N/A'}
                        </span>
                    </div>
                    <div class="video-meta">
                        <span class="video-ago">
                            <i class="far fa-clock"></i> ${video.ago || 'N/A'}
                        </span>
                        <span class="video-id">
                            <i class="fas fa-fingerprint"></i> ${video.videoId.substring(0, 8)}...
                        </span>
                    </div>
                    <div class="video-actions">
                        <button class="action-btn primary" onclick="youtubeApp.showPlayer('${video.videoId}')">
                            <i class="fas fa-play"></i> Play
                        </button>
                        <button class="action-btn" onclick="youtubeApp.getFormats('${video.videoId}')">
                            <i class="fas fa-download"></i> Formats
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async showPlayer(videoId) {
        this.showNotification('Loading player info...', 'info');
        
        try {
            const response = await fetch(`${this.apiBase}/player?videoId=${videoId}`);
            const data = await response.json();

            if (data.success) {
                this.displayPlayerPreview(data);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Player error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    displayPlayerPreview(data) {
        const preview = document.getElementById('playerPreview');
        const content = document.getElementById('previewContent');
        
        const video = data.videoDetails;
        const selected = data.selectedFormat;

        content.innerHTML = `
            <div class="player-details">
                <h4>${video.title}</h4>
                <div class="video-info-grid">
                    <div><strong>Author:</strong> ${video.author}</div>
                    <div><strong>Duration:</strong> ${Math.floor(video.lengthSeconds / 60)}:${(video.lengthSeconds % 60).toString().padStart(2, '0')}</div>
                    <div><strong>Video ID:</strong> ${video.videoId}</div>
                    <div><strong>Quality:</strong> ${selected?.quality || 'Unknown'}</div>
                </div>
                
                <div class="thumbnail-preview">
                    ${video.thumbnail?.length > 0 ? 
                        `<img src="${video.thumbnail[video.thumbnail.length - 1].url}" alt="Thumbnail" style="max-width: 300px; border-radius: 8px;">` : 
                        '<p>No thumbnail available</p>'
                    }
                </div>
                
                <div class="format-info">
                    <h5>Selected Format:</h5>
                    <div class="format-card">
                        <div><strong>ITAG:</strong> ${selected?.itag || 'N/A'}</div>
                        <div><strong>Type:</strong> ${selected?.mimeType?.split(';')[0] || 'N/A'}</div>
                        ${selected?.contentLength ? 
                            `<div><strong>Size:</strong> ${this.formatBytes(selected.contentLength)}</div>` : ''}
                    </div>
                </div>
                
                <div class="player-actions">
                    ${selected?.url ? 
                        `<a href="${selected.url}" target="_blank" class="action-btn primary" style="text-decoration: none;">
                            <i class="fas fa-external-link-alt"></i> Open Direct URL
                        </a>` : 
                        ''
                    }
                    <button class="action-btn" onclick="youtubeApp.showAllFormats('${video.videoId}')">
                        <i class="fas fa-list"></i> Show All Formats
                    </button>
                </div>
            </div>
        `;
        
        preview.style.display = 'block';
        preview.scrollIntoView({ behavior: 'smooth' });
    }

    async getFormats(videoId) {
        this.showNotification('Loading available formats...', 'info');
        
        try {
            const response = await fetch(`${this.apiBase}/player?videoId=${videoId}`);
            const data = await response.json();

            if (data.success) {
                this.showFormatsModal(data);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Formats error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showFormatsModal(data) {
        const modal = document.getElementById('apiModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <h3>Available Formats for: ${data.videoDetails.title}</h3>
            
            <h4>Video Formats (${data.availableFormats.video.length})</h4>
            <div class="formats-grid">
                ${data.availableFormats.video.map(format => `
                    <div class="format-item">
                        <div class="format-header">
                            <strong>ITAG ${format.itag}</strong>
                            <span class="quality-badge">${format.quality || 'Unknown'}</span>
                        </div>
                        <div class="format-details">
                            <div><small>${format.mimeType?.split(';')[0] || ''}</small></div>
                            <div><small>Bitrate: ${this.formatBitrate(format.bitrate)}</small></div>
                            ${format.contentLength ? 
                                `<div><small>Size: ${this.formatBytes(format.contentLength)}</small></div>` : ''}
                        </div>
                        ${format.url ? 
                            `<a href="${format.url}" target="_blank" class="download-btn" onclick="event.stopPropagation();">
                                <i class="fas fa-download"></i> Download
                            </a>` : 
                            '<small class="no-url">No direct URL</small>'
                        }
                    </div>
                `).join('')}
            </div>
            
            <h4>Audio Formats (${data.availableFormats.audio.length})</h4>
            <div class="formats-grid">
                ${data.availableFormats.audio.map(format => `
                    <div class="format-item">
                        <div class="format-header">
                            <strong>ITAG ${format.itag}</strong>
                            <span class="quality-badge">Audio</span>
                        </div>
                        <div class="format-details">
                            <div><small>${format.mimeType?.split(';')[0] || ''}</small></div>
                            <div><small>Bitrate: ${this.formatBitrate(format.bitrate)}</small></div>
                            ${format.contentLength ? 
                                `<div><small>Size: ${this.formatBytes(format.contentLength)}</small></div>` : ''}
                        </div>
                        ${format.url ? 
                            `<a href="${format.url}" target="_blank" class="download-btn" onclick="event.stopPropagation();">
                                <i class="fas fa-download"></i> Download
                            </a>` : 
                            '<small class="no-url">No direct URL</small>'
                        }
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add styles for formats grid
        const style = document.createElement('style');
        style.textContent = `
            .formats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
                margin: 15px 0 30px;
            }
            .format-item {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid var(--border-color);
            }
            .format-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .quality-badge {
                background: var(--primary-color);
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: 600;
            }
            .format-details {
                margin-bottom: 10px;
                color: var(--text-secondary);
            }
            .download-btn {
                display: inline-block;
                background: rgba(255, 0, 0, 0.2);
                color: var(--primary-color);
                padding: 8px 15px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 0.9rem;
                transition: background 0.3s;
                width: 100%;
                text-align: center;
            }
            .download-btn:hover {
                background: rgba(255, 0, 0, 0.3);
            }
            .no-url {
                color: var(--text-secondary);
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
        
        modal.classList.add('active');
    }

    showApiDocs() {
        const modal = document.getElementById('apiModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <h3>API Documentation</h3>
            <p>This application provides REST API endpoints for YouTube data.</p>
            
            <div class="api-section">
                <h4>Search Endpoint</h4>
                <code>POST /api/search</code>
                <p>Search for YouTube videos</p>
                <pre>{
  "query": "search keywords",
  "limit": 20,
  "useProxy": false
}</pre>
                <p><strong>Response:</strong> Array of video objects with metadata</p>
            </div>
            
            <div class="api-section">
                <h4>Player Endpoint</h4>
                <code>GET /api/player?videoId=VIDEO_ID&itag=140</code>
                <p>Get video information and streaming formats</p>
                <p><strong>Parameters:</strong></p>
                <ul>
                    <li><code>videoId</code> - YouTube video ID (required)</li>
                    <li><code>itag</code> - Specific format itag (optional)</li>
                    <li><code>useProxy</code> - Use CORS proxy (optional)</li>
                </ul>
            </div>
            
            <div class="api-section">
                <h4>Download Endpoint</h4>
                <code>GET /api/download?url=STREAM_URL&range=0-1000000</code>
                <p>Download video/audio content</p>
                <p><strong>Parameters:</strong></p>
                <ul>
                    <li><code>url</code> - Stream URL from player endpoint (required)</li>
                    <li><code>range</code> - Byte range for partial download (optional)</li>
                    <li><code>useProxy</code> - Use CORS proxy (optional)</li>
                </ul>
            </div>
            
            <div class="api-section">
                <h4>Example Usage</h4>
                <pre>
// Search for videos
fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'music', limit: 10 })
})
.then(res => res.json())
.then(data => console.log(data));

// Get video formats
fetch('/api/player?videoId=dQw4w9WgXcQ&itag=140')
.then(res => res.json())
.then(data => console.log(data));
                </pre>
            </div>
        `;
        
        modal.classList.add('active');
    }

    showAbout() {
        const modal = document.getElementById('apiModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 4rem; color: var(--primary-color); margin-bottom: 20px;">
                    <i class="fab fa-youtube"></i>
                </div>
                <h3>YouTube API Web App</h3>
                <p>Version 1.0.0</p>
                
                <div style="margin: 30px 0;">
                    <p>A professional web interface for YouTube API with search, streaming, and download capabilities.</p>
                    <p>Built with modern web technologies and deployed on Vercel.</p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h4>Features</h4>
                    <ul style="text-align: left; display: inline-block; margin: 0 auto;">
                        <li>YouTube video search</li>
                        <li>Streaming formats detection</li>
                        <li>Direct download links</li>
                        <li>CORS proxy support</li>
                        <li>Responsive design</li>
                        <li>REST API endpoints</li>
                    </ul>
                </div>
                
                <div style="color: var(--text-secondary); margin-top: 30px;">
                    <p><small>Note: This tool is for educational purposes only.</small></p>
                    <p><small>Respect YouTube's Terms of Service and copyright laws.</small></p>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('apiModal').classList.remove('active');
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        if (!show) {
            document.getElementById('resultsContainer').style.display = 'grid';
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--card-color);
                border-left: 4px solid var(--primary-color);
                padding: 15px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .notification.success { border-left-color: var(--success-color); }
            .notification.error { border-left-color: var(--error-color); }
            .notification.warning { border-left-color: var(--warning-color); }
            .notification.info { border-left-color: var(--primary-color); }
            .notification i { font-size: 1.2rem; }
            .notification.success i { color: var(--success-color); }
            .notification.error i { color: var(--error-color); }
            .notification.warning i { color: var(--warning-color); }
            .notification.info i { color: var(--primary-color); }
            .notification button {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 5px;
                margin-left: auto;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Auto remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    saveSearchHistory(query) {
        const history = this.getSearchHistory();
        if (!history.includes(query)) {
            history.unshift(query);
            if (history.length > 10) history.pop();
            localStorage.setItem('youtube-search-history', JSON.stringify(history));
        }
    }

    getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem('youtube-search-history')) || [];
        } catch {
            return [];
        }
    }

    loadSearchHistory() {
        const history = this.getSearchHistory();
        if (history.length > 0) {
            const input = document.getElementById('searchInput');
            input.placeholder = `Search... (Recent: ${history[0]})`;
        }
    }

    formatBytes(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    formatBitrate(bitrate) {
        if (!bitrate) return 'N/A';
        return (bitrate / 1000).toFixed(0) + ' kbps';
    }
}

// Initialize the app
const youtubeApp = new YouTubeApp();

// Make app available globally
window.youtubeApp = youtubeApp;
