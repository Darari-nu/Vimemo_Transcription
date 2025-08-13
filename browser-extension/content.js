// Vimemo Transcription - Content Script
// Vimeoページで動作して字幕を自動抽出

console.log('🎬 Vimemo Transcription 拡張機能が読み込まれました');

// 字幕抽出の核となる関数（あなたが提供してくれたロジック）
function extractSubtitles() {
    console.log('🔍 字幕抽出を開始...');
    
    const video = document.querySelector('video');
    if (!video) {
        console.warn('🎥 video要素が見つかりません');
        return { success: false, message: 'video要素が見つかりません' };
    }

    // すべての字幕トラックをロード（表示しなくても mode=hidden で中身が取れる）
    for (const track of video.textTracks) {
        track.mode = 'hidden';
    }

    // どのトラックがあるか確認
    for (const track of video.textTracks) {
        console.log('track:', track.kind, track.label, track.language, 'cues:', track.cues ? track.cues.length : 0);
    }

    // 字幕っぽいトラックを拾う（subtitles/captions を優先）
    const pickTrack = () => {
        const tracks = Array.from(video.textTracks);
        return tracks.find(t => (t.kind === 'subtitles' || t.kind === 'captions') && t.cues && t.cues.length > 0)
            || tracks.find(t => t.cues && t.cues.length > 0);
    };

    const track = pickTrack();
    if (!track || !track.cues || track.cues.length === 0) {
        console.warn('⚠️ 字幕トラックが見つかりません。動画を再生してからもう一度お試しください。');
        return { 
            success: false, 
            message: '字幕トラックが見つかりません。\n動画を数秒再生してからもう一度お試しください。' 
        };
    }

    // 字幕テキストを抽出
    const lines = [];
    const linesWithTime = [];
    
    for (let i = 0; i < track.cues.length; i++) {
        const cue = track.cues[i];
        lines.push(cue.text);
        linesWithTime.push(`${cue.startTime.toFixed(2)} --> ${cue.endTime.toFixed(2)}  ${cue.text}`);
    }

    const plainText = lines.join('\n');
    const timedText = linesWithTime.join('\n');

    console.log('✅ 字幕抽出成功！', lines.length, '行を取得');

    return {
        success: true,
        data: {
            plainText,
            timedText,
            trackInfo: {
                kind: track.kind,
                label: track.label,
                language: track.language,
                cueCount: track.cues.length
            }
        }
    };
}

// 拡張機能のポップアップからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 メッセージを受信:', request);

    if (request.action === 'extractSubtitles') {
        const result = extractSubtitles();
        
        // クリップボードにコピー（成功時のみ）
        if (result.success) {
            navigator.clipboard.writeText(result.data.plainText).then(() => {
                console.log('📋 クリップボードにコピーしました');
                result.copied = true;
            }).catch(err => {
                console.warn('📋 クリップボードコピー失敗:', err);
                result.copied = false;
            });
        }

        sendResponse(result);
        return true; // 非同期レスポンスを示す
    }

    if (request.action === 'checkVideoStatus') {
        const video = document.querySelector('video');
        const hasVideo = !!video;
        const isPlaying = video ? !video.paused : false;
        const currentTime = video ? video.currentTime : 0;

        sendResponse({
            hasVideo,
            isPlaying,
            currentTime,
            url: window.location.href
        });
    }
});

// ページ読み込み完了を通知
window.addEventListener('load', () => {
    console.log('📄 Vimeoページの読み込みが完了しました');
});

// 動画の再生状態変化を監視
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const video = document.querySelector('video');
        if (video) {
            video.addEventListener('loadedmetadata', () => {
                console.log('🎬 動画メタデータ読み込み完了');
            });
            
            video.addEventListener('play', () => {
                console.log('▶️ 動画再生開始');
            });
        }
    }, 1000);
});