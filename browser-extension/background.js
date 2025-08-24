// SubtitleGrabber - Background Script
// CORS制限を回避して字幕データを取得

console.log('🚀 SubtitleGrabber Background Script が開始されました');

// Content Scriptからのメッセージを処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background Script メッセージ受信:', request.action);
    
    if (request.action === 'fetchSubtitles') {
        fetchSubtitlesFromUrl(request.url)
            .then(data => {
                console.log('✅ 字幕取得成功:', data.length, '文字');
                sendResponse({
                    success: true,
                    data: data
                });
            })
            .catch(error => {
                console.error('❌ 字幕取得エラー:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        
        // 非同期レスポンスのためtrueを返す
        return true;
    }
});

// 字幕データを取得する関数
async function fetchSubtitlesFromUrl(url) {
    console.log('📡 字幕URL取得開始:', url.substring(0, 100) + '...');
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/vtt,text/plain,*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        console.log('📄 Content-Type:', contentType);
        
        const text = await response.text();
        console.log('📥 取得データサイズ:', text.length, '文字');
        
        return text;
        
    } catch (error) {
        console.error('❌ Fetch エラー:', error);
        throw new Error(`字幕データの取得に失敗しました: ${error.message}`);
    }
}

// 拡張機能のインストール/更新時の処理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('🎉 SubtitleGrabber がインストール/更新されました:', details.reason);
    
    if (details.reason === 'install') {
        console.log('👋 初回インストールです');
    } else if (details.reason === 'update') {
        console.log('🔄 アップデートされました:', details.previousVersion, '=>', chrome.runtime.getManifest().version);
    }
});

console.log('✅ Background Script の初期化が完了しました');