// SubtitleGrabber - Popup Script

class SubtitleGrabberPopup {
    constructor() {
        this.currentTab = null;
        this.extractedData = null;
        this.init();
    }

    async init() {
        console.log('🚀 SubtitleGrabber Popup 初期化開始');
        
        // DOM要素を取得
        this.status = document.getElementById('status');
        this.controls = document.getElementById('controls');
        this.result = document.getElementById('result');
        this.error = document.getElementById('error');
        
        this.extractBtn = document.getElementById('extractBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.retryBtn = document.getElementById('retryBtn');
        
        this.videoInfo = document.getElementById('videoInfo');
        this.resultText = document.getElementById('resultText');
        this.charCount = document.getElementById('charCount');
        this.lineCount = document.getElementById('lineCount');
        this.errorMessage = document.getElementById('errorMessage');

        // イベントリスナーを設定
        this.setupEventListeners();
        
        // 現在のタブ情報を取得してページをチェック
        await this.checkCurrentPage();
    }

    setupEventListeners() {
        this.extractBtn.addEventListener('click', () => this.extractSubtitles());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.retryBtn.addEventListener('click', () => this.checkCurrentPage());
    }

    async checkCurrentPage() {
        try {
            // 現在のアクティブタブを取得
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;

            console.log('📄 現在のページ:', tab.url);

            // Vimeoページかどうかをチェック
            if (!this.isSupportedPage(tab.url)) {
                this.showError('このページはVimeoではありません。\nVimeoの動画ページで拡張機能を使用してください。');
                return;
            }

            // ページの動画ステータスをチェック
            console.log('📤 Content Scriptにメッセージを送信中...');
            const response = await this.sendMessageToContent({ action: 'checkVideoStatus' });
            console.log('📥 Content Scriptからの応答:', response);
            
            if (response) {
                this.showControls(response);
            } else {
                console.error('❌ Content Scriptからの応答がありません');
                this.showError('ページとの通信に失敗しました。\n\n考えられる原因：\n• ページを再読み込みしてください\n• 拡張機能の権限を確認してください\n• F12で開発者ツールのConsoleタブを確認してください');
            }

        } catch (error) {
            console.error('❌ ページチェックエラー:', error);
            this.showError('エラーが発生しました。\nページを再読み込みしてからもう一度お試しください。');
        }
    }

    isSupportedPage(url) {
        return url && (url.includes('vimeo.com') || url.includes('player.vimeo.com'));
    }

    async sendMessageToContent(message) {
        try {
            return await chrome.tabs.sendMessage(this.currentTab.id, message);
        } catch (error) {
            console.error('❌ メッセージ送信エラー:', error);
            return null;
        }
    }

    showControls(videoStatus) {
        this.hideAll();
        this.controls.style.display = 'block';
        this.controls.classList.add('fade-in');

        // 動画情報を表示
        let statusText = `<strong>📍 URL:</strong> ${videoStatus.url}<br>`;
        statusText += `<strong>🎬 動画:</strong> ${videoStatus.hasVideo ? '検出済み' : '未検出'}<br>`;
        
        if (videoStatus.hasVideo) {
            statusText += `<strong>▶️ 状態:</strong> ${videoStatus.isPlaying ? '再生中' : '停止中'}<br>`;
            statusText += `<strong>⏱️ 時間:</strong> ${Math.floor(videoStatus.currentTime)}秒`;
        }

        this.videoInfo.innerHTML = statusText;

        // 抽出ボタンの状態を設定
        if (videoStatus.hasVideo) {
            this.extractBtn.disabled = false;
            this.extractBtn.querySelector('.btn-text').textContent = '字幕を抽出';
        } else {
            this.extractBtn.disabled = true;
            this.extractBtn.querySelector('.btn-text').textContent = '動画が見つかりません';
        }
    }

    async extractSubtitles() {
        console.log('🔍 字幕抽出を開始...');
        
        // ボタンの状態を変更
        this.extractBtn.disabled = true;
        this.extractBtn.classList.add('loading');
        this.extractBtn.querySelector('.btn-text').textContent = '抽出中...';
        this.extractBtn.querySelector('.btn-icon').textContent = '⏳';

        try {
            // Content Scriptに字幕抽出を依頼
            const response = await this.sendMessageToContent({ action: 'extractSubtitles' });
            
            if (response && response.success) {
                this.extractedData = response.data;
                this.showResult(response.data);
                
                // Popup側でクリップボードにコピー
                try {
                    await navigator.clipboard.writeText(response.data.plainText);
                    this.showSuccessMessage('字幕を抽出してクリップボードにコピーしました！');
                } catch (err) {
                    console.warn('📋 クリップボードコピー失敗:', err);
                    this.showSuccessMessage('字幕を抽出しました！（手動でコピーしてください）');
                }
            } else {
                const errorMsg = response ? response.message : 'Content Scriptとの通信に失敗しました';
                this.showError(errorMsg);
            }

        } catch (error) {
            console.error('❌ 字幕抽出エラー:', error);
            this.showError('字幕抽出中にエラーが発生しました。\nページを再読み込みしてからもう一度お試しください。');
        } finally {
            // ボタンの状態をリセット
            this.extractBtn.disabled = false;
            this.extractBtn.classList.remove('loading');
            this.extractBtn.querySelector('.btn-text').textContent = '字幕を抽出';
            this.extractBtn.querySelector('.btn-icon').textContent = '📝';
        }
    }

    showResult(data) {
        this.hideAll();
        this.result.style.display = 'block';
        this.result.classList.add('fade-in');

        // 結果をテキストエリアに表示
        this.resultText.value = data.plainText;
        this.updateStats();

        console.log('✅ 字幕抽出完了:', data.trackInfo);
    }

    updateStats() {
        const text = this.resultText.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        
        this.charCount.textContent = `${charCount.toLocaleString()}文字`;
        this.lineCount.textContent = `${lineCount.toLocaleString()}行`;
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.resultText.value);
            this.copyBtn.textContent = '✅ コピー済み';
            setTimeout(() => {
                this.copyBtn.innerHTML = '📋 コピー';
            }, 2000);
        } catch (error) {
            console.error('❌ コピーエラー:', error);
            // フォールバック
            this.resultText.select();
            document.execCommand('copy');
            alert('テキストを選択しました。Ctrl+C（Mac: ⌘+C）でコピーしてください');
        }
    }

    downloadText() {
        const blob = new Blob([this.resultText.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `subtitles_${new Date().getTime()}.txt`,
            saveAs: true
        }, () => {
            URL.revokeObjectURL(url);
        });
    }

    showError(message) {
        this.hideAll();
        this.error.style.display = 'block';
        this.error.classList.add('fade-in');
        this.errorMessage.textContent = message;
    }

    showSuccessMessage(message) {
        // 既存の成功メッセージを削除
        const existing = document.querySelector('.success-message');
        if (existing) existing.remove();

        // 新しい成功メッセージを作成
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message fade-in';
        successDiv.textContent = message;
        
        // 結果セクションの前に挿入
        this.result.insertBefore(successDiv, this.result.firstChild);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    hideAll() {
        this.status.style.display = 'none';
        this.controls.style.display = 'none';
        this.result.style.display = 'none';
        this.error.style.display = 'none';
    }
}

// ポップアップ初期化
document.addEventListener('DOMContentLoaded', () => {
    new SubtitleGrabberPopup();
});