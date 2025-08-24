// Vimeo Transcription - Content Script
// Vimeoページで動作して字幕を自動抽出

console.log(`⚡ Vimeo Transcription 拡張機能が読み込まれました`);
console.log('📍 現在のURL:', window.location.href);
console.log('🔧 Content Script実行時刻:', new Date().toISOString());

// 字幕抽出の核となる関数
function extractSubtitles() {
    console.log('🔍 字幕抽出を開始...');
    
    // Vimeoの字幕抽出
    const video = document.querySelector('video');
    if (!video) {
        return {
            success: false,
            message: '動画要素が見つかりません。Vimeoの動画ページで実行してください。'
        };
    }
    
    console.log('🎬 動画要素発見:', video);
    
    const textTracks = video.textTracks;
    console.log('📊 textTracks数:', textTracks.length);
    
    if (textTracks.length === 0) {
        return {
            success: false,
            message: '字幕トラックが見つかりません。\n\n確認事項:\n• この動画に字幕がありますか？\n• 字幕ボタン（CC）を押して有効にしてください'
        };
    }
    
    // 利用可能な字幕トラックを検索
    let selectedTrack = null;
    for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        console.log(`🎯 Track ${i}:`, {
            kind: track.kind,
            label: track.label,
            language: track.language,
            mode: track.mode,
            cues: track.cues ? track.cues.length : 'null'
        });
        
        if (track.kind === 'captions' || track.kind === 'subtitles') {
            selectedTrack = track;
            break;
        }
    }
    
    if (!selectedTrack) {
        return {
            success: false,
            message: '字幕トラックが見つかりません。字幕を有効にしてから実行してください。'
        };
    }
    
    // トラックを有効化
    selectedTrack.mode = 'showing';
    
    if (!selectedTrack.cues || selectedTrack.cues.length === 0) {
        return {
            success: false,
            message: '字幕データが読み込まれていません。\n\n解決方法:\n• 動画を少し再生してから実行してください\n• 字幕ボタン（CC）をONにしてください'
        };
    }
    
    // すべてのcuesからテキストを抽出
    const timedSubtitles = [];
    const plainTextLines = [];
    
    for (let i = 0; i < selectedTrack.cues.length; i++) {
        const cue = selectedTrack.cues[i];
        const text = cue.text.trim();
        if (text) {
            const startTime = formatTime(cue.startTime);
            const endTime = formatTime(cue.endTime);
            
            timedSubtitles.push(`${startTime} --> ${endTime}`);
            timedSubtitles.push(text);
            timedSubtitles.push('');
            
            plainTextLines.push(text);
        }
    }
    
    const plainText = plainTextLines.join('\n');
    const timedText = timedSubtitles.join('\n');
    
    console.log(`✅ 字幕抽出成功: ${selectedTrack.cues.length} 個のセグメント`);
    
    return {
        success: true,
        data: {
            plainText: plainText,
            timedText: timedText,
            trackInfo: {
                site: 'Vimeo',
                kind: selectedTrack.kind,
                label: selectedTrack.label || 'Vimeo字幕',
                language: selectedTrack.language || 'unknown',
                cueCount: selectedTrack.cues.length
            }
        },
        message: `🎉 字幕抽出が完了しました！\n${selectedTrack.cues.length} 個の字幕セグメントを取得しました。`
    };
}

// 時間フォーマット関数
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = secs.toString().padStart(2, '0');
    const ms = milliseconds.toString().padStart(3, '0');
    
    return `${h}:${m}:${s}.${ms}`;
}

// 動画の状態をチェックする関数
function checkVideoStatus() {
    console.log('📊 動画ステータスをチェック中...');
    
    const video = document.querySelector('video');
    if (!video) {
        return {
            hasVideo: false,
            url: window.location.href
        };
    }
    
    return {
        hasVideo: true,
        isPlaying: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration,
        url: window.location.href
    };
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 メッセージ受信:', request.action);
    
    try {
        if (request.action === 'checkVideoStatus') {
            const status = checkVideoStatus();
            console.log('📊 ビデオ状態:', status);
            sendResponse(status);
            
        } else if (request.action === 'extractSubtitles') {
            const result = extractSubtitles();
            console.log('📝 字幕抽出結果:', result.success ? '成功' : '失敗');
            sendResponse(result);
            
        } else {
            console.warn('❓ 未知のアクション:', request.action);
            sendResponse({ success: false, message: '未知のアクション' });
        }
    } catch (error) {
        console.error('❌ エラー:', error);
        sendResponse({ 
            success: false, 
            message: `エラーが発生しました: ${error.message}` 
        });
    }
});

console.log('✅ Vimeo Transcription Content Script 初期化完了');