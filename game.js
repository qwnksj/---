// game.js - 英语单词记忆游戏核心逻辑

class WordGame {
    constructor() {
        this.words = [];
        this.currentWordBank = 'words.txt';
        this.gameState = {
            mode: 'random',
            score: 0,
            correct: 0,
            total: 0,
            currentIndex: 0,
            selectedIndices: [],
            startTime: null,
            isPlaying: false
        };
        this.config = this.loadConfig();
        this.initialize();
    }

    initialize() {
        this.loadWords();
        this.setupEventListeners();
    }

    loadConfig() {
        return {
            autoDelay: parseFloat(localStorage.getItem('autoDelay')) || 1.5,
            soundEffects: localStorage.getItem('soundEffects') !== 'false',
            showHints: localStorage.getItem('showHints') !== 'false',
            difficultyAdjust: localStorage.getItem('difficultyAdjust') !== 'false'
        };
    }

    async loadWords() {
        try {
            const response = await fetch(this.currentWordBank);
            const text = await response.text();
            this.parseWords(text);
            this.updateUI();
        } catch (error) {
            console.error('加载词库失败:', error);
            this.loadSampleWords();
        }
    }

    parseWords(text) {
        this.words = [];
        const lines = text.trim().split('\n');
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (line && line.includes('|')) {
                const [english, chinese] = line.split('|').map(s => s.trim());
                if (english && chinese) {
                    this.words.push({
                        id: index,
                        english,
                        chinese,
                        studied: false,
                        difficulty: 1,
                        wrongTimes: 0,
                        correctTimes: 0,
                        accuracy: 0,
                        lastStudied: 0,
                        masterLevel: 0,
                        unit: Math.floor(index / (this.words.length / 10)) + 1
                    });
                }
            }
        });
    }

    loadSampleWords() {
        // 加载示例单词
        const sampleWords = [
            'abandon|放弃',
            'ability|能力',
            'able|能够的',
            'about|关于',
            'above|在...上面',
            'abroad|国外',
            'absence|缺席',
            'absolute|绝对的',
            'absorb|吸收',
            'academic|学术的'
        ];
        
        this.parseWords(sampleWords.join('\n'));
    }

    setupEventListeners() {
        // 设置事件监听器
        document.addEventListener('DOMContentLoaded', () => {
            this.updateUI();
        });
    }

    updateUI() {
        // 更新界面显示
        const wordCount = this.words.length;
        document.getElementById('wordCountDisplay').textContent = `单词数: ${wordCount}`;
        
        // 更新进度
        this.updateProgress();
    }

    updateProgress() {
        const studied = this.words.filter(w => w.studied).length;
        const total = this.words.length;
        const percentage = total > 0 ? (studied / total * 100) : 0;
        
        if (document.getElementById('progressText')) {
            document.getElementById('progressText').textContent = 
                `${studied}/${total} (${percentage.toFixed(1)}%)`;
            
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
        }
    }

    // 游戏模式
    startRandomTest(wordCount = 20) {
        wordCount = Math.min(wordCount, this.words.length);
        this.gameState.selectedIndices = this.getRandomIndices(wordCount);
        this.gameState.mode = 'random';
        this.startGame();
    }

    startCustomPractice(settings) {
        const { wordCount, difficulty, options, randomMode } = settings;
        
        let indices;
        if (randomMode) {
            indices = this.getRandomIndices(wordCount);
        } else {
            const filtered = this.words
                .map((word, index) => ({ word, index }))
                .filter(({ word }) => difficulty === 0 || word.difficulty === difficulty)
                .map(({ index }) => index);
            
            indices = this.getRandomFromArray(filtered, wordCount);
        }
        
        this.gameState.selectedIndices = indices;
        this.gameState.mode = 'custom';
        this.startGame();
    }

    startGame() {
        this.gameState.score = 0;
        this.gameState.correct = 0;
        this.gameState.total = this.gameState.selectedIndices.length;
        this.gameState.currentIndex = 0;
        this.gameState.startTime = Date.now();
        this.gameState.isPlaying = true;
        
        this.showQuestion();
    }

    showQuestion() {
        if (!this.gameState.isPlaying || 
            this.gameState.currentIndex >= this.gameState.selectedIndices.length) {
            this.showResults();
            return;
        }

        const wordIndex = this.gameState.selectedIndices[this.gameState.currentIndex];
        const word = this.words[wordIndex];
        
        // 更新界面显示当前问题
        this.displayQuestion(word);
    }

    displayQuestion(word) {
        // 这里应该更新游戏界面的HTML
        // 由于这是一个类，具体HTML更新应该在HTML文件中处理
        console.log('显示单词:', word.english);
        
        // 标记为已学习
        word.studied = true;
        word.lastStudied = Date.now();
        
        // 保存进度
        this.saveProgress();
    }

    checkAnswer(selectedOption, correctOption) {
        const wordIndex = this.gameState.selectedIndices[this.gameState.currentIndex];
        const word = this.words[wordIndex];
        const isCorrect = selectedOption === correctOption;
        
        if (isCorrect) {
            this.gameState.score += 5;
            this.gameState.correct++;
            word.correctTimes++;
            this.playSound('correct');
        } else {
            this.gameState.score = Math.max(0, this.gameState.score - 2);
            word.wrongTimes++;
            this.playSound('wrong');
        }
        
        // 更新单词统计数据
        this.updateWordStats(word, isCorrect);
        
        // 显示结果
        this.showAnswerFeedback(isCorrect, word);
        
        // 自动进入下一题
        setTimeout(() => {
            this.gameState.currentIndex++;
            this.showQuestion();
        }, this.config.autoDelay * 1000);
    }

    updateWordStats(word, isCorrect) {
        const totalAttempts = word.correctTimes + word.wrongTimes;
        word.accuracy = totalAttempts > 0 ? (word.correctTimes / totalAttempts * 100) : 0;
        
        // 动态调整难度
        if (this.config.difficultyAdjust && totalAttempts >= 5) {
            if (word.accuracy > 80 && word.difficulty > 1) {
                word.difficulty--;
            } else if (word.accuracy < 40 && word.difficulty < 3) {
                word.difficulty++;
            }
        }
        
        // 更新掌握程度
        if (totalAttempts >= 10) {
            if (word.accuracy >= 90) word.masterLevel = 5;
            else if (word.accuracy >= 80) word.masterLevel = 4;
            else if (word.accuracy >= 70) word.masterLevel = 3;
            else if (word.accuracy >= 60) word.masterLevel = 2;
            else word.masterLevel = 1;
        }
    }

    showAnswerFeedback(isCorrect, word) {
        // 显示答案反馈
        const message = isCorrect ? 
            `✓ 回答正确! ${word.english} = ${word.chinese}` :
            `✗ 回答错误! 正确答案是: ${word.chinese}`;
        
        if (typeof showFeedback === 'function') {
            showFeedback(message, isCorrect ? 'success' : 'error');
        }
    }

    showResults() {
        this.gameState.isPlaying = false;
        const timeTaken = (Date.now() - this.gameState.startTime) / 1000;
        const accuracy = this.gameState.total > 0 ? 
            (this.gameState.correct / this.gameState.total * 100) : 0;
        
        // 保存记录
        this.saveRecord({
            mode: this.gameState.mode,
            score: this.gameState.score,
            correct: this.gameState.correct,
            total: this.gameState.total,
            accuracy: accuracy,
            time: timeTaken,
            date: new Date().toISOString()
        });
        
        // 显示结果页面
        this.displayResults({
            score: this.gameState.score,
            correct: this.gameState.correct,
            total: this.gameState.total,
            accuracy: accuracy,
            time: timeTaken
        });
    }

    displayResults(results) {
        // 这里应该更新结果页面的HTML
        console.log('游戏结果:', results);
        
        // 实际应用中会跳转到结果页面或更新当前页面
        if (typeof showResultsPage === 'function') {
            showResultsPage(results);
        }
    }

    // 辅助方法
    getRandomIndices(count) {
        const indices = Array.from({ length: this.words.length }, (_, i) => i);
        return this.shuffleArray(indices).slice(0, count);
    }

    getRandomFromArray(array, count) {
        return this.shuffleArray([...array]).slice(0, Math.min(count, array.length));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    playSound(type) {
        if (!this.config.soundEffects) return;
        
        const audio = new Audio();
        audio.src = type === 'correct' ? 
            'assets/sounds/correct.mp3' : 
            'assets/sounds/wrong.mp3';
        audio.play().catch(e => console.log('音效播放失败:', e));
    }

    saveProgress() {
        try {
            const progress = {
                words: this.words,
                lastUpdated: Date.now()
            };
            localStorage.setItem('wordGameProgress', JSON.stringify(progress));
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    saveRecord(record) {
        try {
            const records = JSON.parse(localStorage.getItem('wordGameRecords') || '[]');
            records.push(record);
            localStorage.setItem('wordGameRecords', JSON.stringify(records));
        } catch (error) {
            console.error('保存记录失败:', error);
        }
    }

    // 复习功能
    reviewWrongWords() {
        const wrongWords = this.words
            .map((word, index) => ({ word, index }))
            .filter(({ word }) => word.wrongTimes > word.correctTimes)
            .map(({ index }) => index);
        
        if (wrongWords.length === 0) {
            alert('暂无需要复习的错题！继续保持！');
            return;
        }
        
        this.gameState.selectedIndices = wrongWords;
        this.gameState.mode = 'review';
        this.startGame();
    }

    reviewByUnit(unit) {
        const unitWords = this.words
            .map((word, index) => ({ word, index }))
            .filter(({ word }) => word.unit === unit)
            .map(({ index }) => index);
        
        if (unitWords.length === 0) {
            alert(`单元 ${unit} 没有单词！`);
            return;
        }
        
        this.gameState.selectedIndices = unitWords;
        this.gameState.mode = 'unit';
        this.startGame();
    }
}

// 创建全局游戏实例
window.wordGame = new WordGame();
