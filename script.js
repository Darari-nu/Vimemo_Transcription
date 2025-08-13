// Vimemo Transcription - メインスクリプト

class VimemoTranscription {
    constructor() {
        this.init();
        this.showTimestamps = false;
        this.extractedData = null;
        this.vimeoPlayer = null;
    }

    init() {
        // DOM要素の取得
        this.urlInput = document.getElementById('vimeo-url');
        this.loadBtn = document.getElementById('load-video');
        this.videoSection = document.getElementById('video-section');
        this.videoContainer = document.getElementById('video-container');
        this.extractBtn = document.getElementById('extract-subtitles');
        this.resultSection = document.getElementById('result-section');
        this.resultText = document.getElementById('result-text');
        this.copyBtn = document.getElementById('copy-text');
        this.downloadBtn = document.getElementById('download-text');
        this.toggleBtn = document.getElementById('toggle-timestamps');
        this.charCount = document.getElementById('char-count');
        this.lineCount = document.getElementById('line-count');

        // イベントリスナーの設定
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.loadBtn.addEventListener('click', () => this.loadVideo());
        this.extractBtn.addEventListener('click', () => this.extractSubtitles());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.toggleBtn.addEventListener('click', () => this.toggleTimestamps());
        
        // Enterキーでも動画読み込み
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadVideo();
            }
        });
    }

    // Vimeo動画を読み込む
    loadVideo() {
        console.log('loadVideo() が呼ばれました');
        const url = this.urlInput.value.trim();
        console.log('入力されたURL:', url);
        
        if (!url) {
            alert('VimeoのURLを入力してください');
            return;
        }

        const isValid = this.isValidVimeoUrl(url);
        console.log('URL検証結果:', isValid);
        
        if (!isValid) {
            alert('有効なVimeoのURLを入力してください\n例: https://vimeo.com/123456789');
            return;
        }

        const videoId = this.extractVimeoId(url);
        const privacyHash = this.extractPrivacyHash(url);
        console.log('抽出されたVideo ID:', videoId);
        console.log('プライバシーハッシュ:', privacyHash);
        
        if (!videoId) {
            alert('VimeoのIDを取得できませんでした');
            return;
        }

        this.loadBtn.classList.add('loading');
        this.loadBtn.textContent = '読み込み中...';

        // 既存のプレイヤーを削除
        this.videoContainer.innerHTML = '';
        
        // Vimeo Player SDKを使用してプレイヤーを作成
        let playerUrl = `https://vimeo.com/${videoId}`;
        if (privacyHash) {
            playerUrl += `/${privacyHash}`;
        }
        
        console.log('プレイヤーURL:', playerUrl);

        this.vimeoPlayer = new Vimeo.Player(this.videoContainer, {
            url: playerUrl,
            width: '100%',
            height: 400,
            color: '667eea',
            title: true,
            byline: true,
            portrait: true
        });

        // プレイヤー読み込み完了
        this.vimeoPlayer.ready().then(() => {
            console.log('Vimeoプレイヤー準備完了');
            this.loadBtn.classList.remove('loading');
            this.loadBtn.textContent = '動画を読み込む';
        }).catch((error) => {
            console.error('プレイヤー読み込みエラー:', error);
            this.showEmbedError();
            this.loadBtn.classList.remove('loading');
            this.loadBtn.textContent = '動画を読み込む';
        });

        // 動画セクションを表示
        this.videoSection.style.display = 'block';
        this.videoSection.classList.add('fade-in');

        // タイムアウト設定（10秒で読み込み状態をリセット）
        setTimeout(() => {
            if (this.loadBtn.classList.contains('loading')) {
                this.loadBtn.classList.remove('loading');
                this.loadBtn.textContent = '動画を読み込む';
            }
        }, 10000);

        // 結果セクションを非表示
        this.resultSection.style.display = 'none';
    }

    // VimeoのURLが有効かチェック
    isValidVimeoUrl(url) {
        // 通常形式: https://vimeo.com/123456789 または https://vimeo.com/123456789?h=abc123
        // 共有形式: https://vimeo.com/123456789/abc123def?share=copy
        const normalRegex = /^https?:\/\/(www\.)?vimeo\.com\/\d+(\?.*)?$/;
        const shareRegex = /^https?:\/\/(www\.)?vimeo\.com\/\d+\/[a-zA-Z0-9]+(\?.*)?$/;
        return normalRegex.test(url) || shareRegex.test(url);
    }

    // VimeoのIDを抽出
    extractVimeoId(url) {
        const match = url.match(/vimeo\.com\/(\d+)/);
        return match ? match[1] : null;
    }

    // プライバシーハッシュを抽出
    extractPrivacyHash(url) {
        // 通常形式: ?h=abc123
        let match = url.match(/[?&]h=([a-zA-Z0-9]+)/);
        if (match) return match[1];
        
        // 共有形式: /123456789/abc123def
        match = url.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    // 字幕を抽出
    async extractSubtitles() {
        if (!this.vimeoPlayer) {
            alert('動画が読み込まれていません');
            return;
        }

        this.extractBtn.classList.add('loading');
        this.extractBtn.textContent = '抽出中...';

        // まずVimeo APIで字幕取得を試す
        const success = await this.tryVimeoAPI();
        
        if (!success) {
            // API取得に失敗した場合は手動抽出で結果を入力してもらう
            this.showManualInputDialog();
        }

        this.extractBtn.classList.remove('loading');
        this.extractBtn.textContent = '字幕を抽出';
    }

    // Vimeo APIで字幕取得を試行
    async tryVimeoAPI() {
        const videoId = this.extractVimeoId(this.urlInput.value);
        console.log('Vimeo APIで字幕取得を試行:', videoId);

        try {
            // 公開APIエンドポイントを試す
            const response = await fetch(`https://api.vimeo.com/videos/${videoId}/texttracks`, {
                headers: {
                    'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                }
            });

            if (response.ok) {
                const textTracks = await response.json();
                console.log('取得した字幕トラック:', textTracks);

                if (textTracks.data && textTracks.data.length > 0) {
                    // 字幕ファイルをダウンロード
                    return await this.downloadSubtitleFile(textTracks.data[0]);
                }
            } else {
                console.log('Vimeo API応答エラー:', response.status);
            }
        } catch (error) {
            console.log('Vimeo API取得エラー:', error);
        }

        return false;
    }

    // 字幕ファイルをダウンロード
    async downloadSubtitleFile(track) {
        try {
            if (track.link) {
                const response = await fetch(track.link);
                if (response.ok) {
                    const subtitleText = await response.text();
                    console.log('字幕ファイル取得成功:', subtitleText.substring(0, 200) + '...');
                    
                    // WebVTT形式をプレーンテキストに変換
                    const plainText = this.convertWebVTTToPlainText(subtitleText);
                    
                    // 結果を表示
                    this.extractedData = plainText;
                    this.displayResult(plainText);
                    
                    return true;
                }
            }
        } catch (error) {
            console.log('字幕ファイルダウンロードエラー:', error);
        }
        return false;
    }

    // WebVTT形式をプレーンテキストに変換
    convertWebVTTToPlainText(vttText) {
        const lines = vttText.split('\n');
        const textLines = [];
        
        for (let line of lines) {
            line = line.trim();
            // タイムスタンプや制御文字をスキップ
            if (line && 
                !line.startsWith('WEBVTT') && 
                !line.includes('-->') && 
                !line.match(/^\d+$/) &&
                !line.startsWith('NOTE') &&
                !line.startsWith('STYLE') &&
                !line.startsWith('REGION')) {
                
                // HTMLタグを除去
                const cleanLine = line.replace(/<[^>]*>/g, '');
                if (cleanLine) {
                    textLines.push(cleanLine);
                }
            }
        }
        
        return textLines.join('\n');
    }

    // Vimeoページを新しいタブで開いて自動抽出
    openVimeoPageWithAutoExtraction() {
        const videoId = this.extractVimeoId(this.urlInput.value);
        const privacyHash = this.extractPrivacyHash(this.urlInput.value);
        
        let vimeoUrl = `https://vimeo.com/${videoId}`;
        if (privacyHash) {
            vimeoUrl += `/${privacyHash}`;
        }

        // 新しいタブで開く
        const newTab = window.open(vimeoUrl, '_blank');
        
        // 簡単な案内を表示
        this.showSimpleInstructions(vimeoUrl);
    }

    // 簡単な案内を表示
    showSimpleInstructions(vimeoUrl) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 600px;
            margin: 20px;
            text-align: center;
        `;

        content.innerHTML = `
            <h2>🚀 簡単3ステップで字幕抽出！</h2>
            <div style="text-align: left; margin: 20px 0;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <strong>1. 新しいタブでVimeoページが開きます</strong><br>
                    <small>動画を数秒再生してください</small>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <strong>2. F12キーでコンソールを開く</strong><br>
                    <small>開発者ツールが表示されます</small>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <strong>3. 下のコードをコピー＆ペーストして実行</strong><br>
                    <small>自動的にクリップボードにコピーされます</small>
                </div>
            </div>
            
            <textarea readonly id="quick-code" style="width: 100%; height: 100px; font-family: monospace; font-size: 12px; margin: 10px 0;">(() => { const v = document.querySelector('video'); if (!v) return; for (const t of v.textTracks) t.mode = 'hidden'; const pick = () => Array.from(v.textTracks).find(t => (t.kind === 'subtitles' || t.kind === 'captions') && t.cues && t.cues.length) || Array.from(v.textTracks).find(t => t.cues && t.cues.length); const t = pick(); if (!t || !t.cues || t.cues.length === 0) { console.warn('字幕が見つかりません'); return; } const lines = []; for (let i = 0; i < t.cues.length; i++) lines.push(t.cues[i].text); navigator.clipboard?.writeText(lines.join('\\n')); console.log('✅ 字幕をクリップボードにコピーしました！'); return lines.join('\\n'); })();</textarea>
            
            <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: center;">
                <button id="copy-quick-code" style="background: #28a745; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">📋 コードをコピー</button>
                <button id="open-vimeo" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">🎬 Vimeoを開く</button>
                <button id="close-simple-modal" style="background: #6c757d; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer;">閉じる</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // イベントリスナー
        content.querySelector('#copy-quick-code').addEventListener('click', () => {
            const code = content.querySelector('#quick-code').value;
            navigator.clipboard.writeText(code).then(() => {
                alert('コードをクリップボードにコピーしました！');
            });
        });

        content.querySelector('#open-vimeo').addEventListener('click', () => {
            window.open(vimeoUrl, '_blank');
        });

        content.querySelector('#close-simple-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // 手動抽出の案内を表示
    showManualExtraction() {
        const manualCode = `(() => {
  const v = document.querySelector('video');
  if (!v) { console.warn('🎥 video要素が見つからないよ'); return; }

  // すべての字幕トラックをロード（表示しなくても mode=hidden で中身が取れる）
  for (const t of v.textTracks) t.mode = 'hidden';

  // どのトラックがあるか確認（ラベルや言語をログ表示）
  for (const t of v.textTracks) {
    console.log('track:', t.kind, t.label, t.language, 'cues:', t.cues ? t.cues.length : 0);
  }

  // 字幕っぽいトラックを拾う（subtitles/captions を優先）
  const pick = () => {
    const arr = Array.from(v.textTracks);
    return arr.find(t => (t.kind === 'subtitles' || t.kind === 'captions') && t.cues && t.cues.length)
        || arr.find(t => t.cues && t.cues.length);
  };

  const t = pick();
  if (!t || !t.cues || t.cues.length === 0) {
    console.warn('⚠️ まだ読み込み中かも。数秒再生→もう一度実行してみて！');
    return;
  }

  // 取り出し（タイムコードも欲しければコメント外してね）
  const lines = [];
  for (let i = 0; i < t.cues.length; i++) {
    const c = t.cues[i];
    // lines.push(\`\${c.startTime.toFixed(2)} --> \${c.endTime.toFixed(2)}  \${c.text}\`);
    lines.push(c.text);
  }

  // 結果をコンソールに出力
  console.log('=== 抽出された字幕 ===');
  console.log(lines.join('\\n'));
  
  // クリップボードにコピー
  navigator.clipboard?.writeText(lines.join('\\n')).then(()=>console.log('✅ クリップボードにコピーしたよ')).catch(()=>{});
  
  return lines.join('\\n');
})();`;

        // モーダル的な案内を表示
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            margin: 20px;
        `;

        content.innerHTML = `
            <h2>🔧 手動抽出が必要です</h2>
            <p>セキュリティ制限により、自動抽出ができません。以下の手順で抽出してください：</p>
            <ol>
                <li><strong>動画を数秒再生</strong>してください（字幕データの読み込みのため）</li>
                <li><strong>F12キー</strong>でブラウザの開発者ツールを開く</li>
                <li><strong>Console</strong>タブをクリック</li>
                <li>下のコードをコピーして<strong>コンソールに貼り付け</strong></li>
                <li><strong>Enterキー</strong>で実行</li>
            </ol>
            
            <h3>📋 実行コード</h3>
            <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; margin: 10px 0;">${manualCode}</textarea>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="copy-code" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">コードをコピー</button>
                <button id="close-modal" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">閉じる</button>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                💡 <strong>ヒント:</strong> 抽出されたテキストは自動的にクリップボードにコピーされます
            </p>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // イベントリスナー
        content.querySelector('#copy-code').addEventListener('click', () => {
            navigator.clipboard.writeText(manualCode).then(() => {
                alert('コードをクリップボードにコピーしました！');
            });
        });

        content.querySelector('#close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // クリップボードにコピー
    async copyToClipboard() {
        if (!this.resultText.value) {
            alert('コピーするテキストがありません');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.resultText.value);
            this.copyBtn.textContent = '✅ コピー済み';
            setTimeout(() => {
                this.copyBtn.textContent = '📋 コピー';
            }, 2000);
        } catch (error) {
            console.error('コピーエラー:', error);
            // フォールバック: テキストエリアを選択
            this.resultText.select();
            document.execCommand('copy');
            alert('テキストを選択しました。Ctrl+C（Mac: ⌘+C）でコピーしてください');
        }
    }

    // テキストファイルとしてダウンロード
    downloadText() {
        if (!this.resultText.value) {
            alert('ダウンロードするテキストがありません');
            return;
        }

        const blob = new Blob([this.resultText.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vimeo_subtitles_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // タイムスタンプ表示の切り替え
    toggleTimestamps() {
        if (!this.extractedData) {
            alert('まず字幕を抽出してください');
            return;
        }

        this.showTimestamps = !this.showTimestamps;
        this.displayResult(this.extractedData);
        
        this.toggleBtn.textContent = this.showTimestamps ? 
            '📝 テキストのみ表示' : '🕐 タイムスタンプ表示';
    }

    // 結果を表示
    displayResult(text) {
        this.resultText.value = text;
        this.updateStats();
        
        // 結果セクションを表示
        this.resultSection.style.display = 'block';
        this.resultSection.classList.add('fade-in');
        
        // 結果セクションまでスクロール
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 文字数・行数を更新
    updateStats() {
        const text = this.resultText.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        
        this.charCount.textContent = `${charCount.toLocaleString()}文字`;
        this.lineCount.textContent = `${lineCount.toLocaleString()}行`;
    }

    // エラー表示
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #f5c6cb;
            margin: 20px 0;
            position: relative;
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ エラー:</strong> ${message}
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #721c24;
            ">×</button>
        `;
        
        // 動画セクションの前に挿入
        this.videoSection.parentNode.insertBefore(errorDiv, this.videoSection);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // 埋め込みエラー専用表示
    showEmbedError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
            position: relative;
        `;
        errorDiv.innerHTML = `
            <h3>🔒 限定公開動画の埋め込み設定が必要です</h3>
            <p>この動画は埋め込みが制限されています。以下の手順で設定を変更してください：</p>
            <ol style="margin: 15px 0; padding-left: 20px;">
                <li><strong>Vimeoにログイン</strong>して動画ページを開く</li>
                <li>動画の<strong>「設定」</strong>をクリック</li>
                <li><strong>「プライバシー」</strong>タブを選択</li>
                <li><strong>「埋め込み」</strong>セクションで以下を設定：
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>✅「特定のドメインで埋め込みを許可」をON</li>
                        <li>✅「どこでも埋め込める」を選択（推奨）</li>
                    </ul>
                </li>
                <li><strong>「保存」</strong>をクリック</li>
            </ol>
            <p><strong>💡 代替方法:</strong> 埋め込み設定を変更できない場合、Vimeoで動画を直接開いて<a href="#" onclick="this.closest('.container').querySelector('#extract-subtitles').scrollIntoView(); this.closest('div').remove(); return false;" style="color: #667eea; text-decoration: underline;">手動で字幕抽出</a>してください。</p>
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #856404;
            ">×</button>
        `;
        
        // 動画セクションの前に挿入
        this.videoSection.parentNode.insertBefore(errorDiv, this.videoSection);
    }

    // 手動入力ダイアログを表示
    showManualInputDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            margin: 20px;
        `;

        content.innerHTML = `
            <h2>📝 字幕テキストを貼り付けてください</h2>
            <p>以下の手順で字幕を取得して、下のテキストエリアに貼り付けてください：</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 15px 0;">
                <strong>手順：</strong>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>下の「Vimeoで字幕取得」ボタンをクリック</li>
                    <li>新しいタブで動画を数秒再生</li>
                    <li>F12 → Console → コードを実行</li>
                    <li>コピーされた字幕テキストを下に貼り付け</li>
                </ol>
            </div>

            <div style="margin: 20px 0;">
                <button id="open-vimeo-manual" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">🎬 Vimeoで字幕取得</button>
                <button id="copy-extraction-code" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">📋 抽出コードをコピー</button>
            </div>

            <label for="manual-subtitle-input" style="display: block; margin-bottom: 10px; font-weight: bold;">字幕テキスト:</label>
            <textarea id="manual-subtitle-input" placeholder="字幕テキストをここに貼り付けてください..." style="width: 100%; height: 200px; padding: 15px; border: 2px solid #e1e5e9; border-radius: 10px; font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
            
            <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                <button id="cancel-manual" style="background: #6c757d; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer;">キャンセル</button>
                <button id="submit-manual" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">字幕を設定</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const vimeoUrl = this.getVimeoUrl();
        const extractionCode = `(() => { const v = document.querySelector('video'); if (!v) return; for (const t of v.textTracks) t.mode = 'hidden'; const pick = () => Array.from(v.textTracks).find(t => (t.kind === 'subtitles' || t.kind === 'captions') && t.cues && t.cues.length) || Array.from(v.textTracks).find(t => t.cues && t.cues.length); const t = pick(); if (!t || !t.cues || t.cues.length === 0) { console.warn('字幕が見つかりません'); return; } const lines = []; for (let i = 0; i < t.cues.length; i++) lines.push(t.cues[i].text); navigator.clipboard?.writeText(lines.join('\\n')); console.log('✅ 字幕をクリップボードにコピーしました！'); return lines.join('\\n'); })();`;

        // イベントリスナー
        content.querySelector('#open-vimeo-manual').addEventListener('click', () => {
            window.open(vimeoUrl, '_blank');
        });

        content.querySelector('#copy-extraction-code').addEventListener('click', () => {
            navigator.clipboard.writeText(extractionCode).then(() => {
                alert('抽出コードをクリップボードにコピーしました！');
            });
        });

        content.querySelector('#submit-manual').addEventListener('click', () => {
            const subtitleText = content.querySelector('#manual-subtitle-input').value.trim();
            if (subtitleText) {
                this.extractedData = subtitleText;
                this.displayResult(subtitleText);
                document.body.removeChild(modal);
            } else {
                alert('字幕テキストを入力してください');
            }
        });

        content.querySelector('#cancel-manual').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Vimeo URLを取得
    getVimeoUrl() {
        const videoId = this.extractVimeoId(this.urlInput.value);
        const privacyHash = this.extractPrivacyHash(this.urlInput.value);
        
        let vimeoUrl = `https://vimeo.com/${videoId}`;
        if (privacyHash) {
            vimeoUrl += `/${privacyHash}`;
        }
        return vimeoUrl;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new VimemoTranscription();
});