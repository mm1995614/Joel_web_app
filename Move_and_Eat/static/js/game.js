class LocalGobbletGame {
    constructor() {
        // 遊戲狀態
        this.board = this.initializeBoard();
        this.winner = null;
        
        // 玩家棋子數量 (每個玩家6顆棋子)
        this.playerPieces = {
            0: { large: 2, medium: 2, small: 2 },
            1: { large: 2, medium: 2, small: 2 }
        };
        
        // 選中的棋子
        this.selectedPiece = null;
        
        // 遊戲歷史記錄（用於上一步功能）
        this.gameHistory = [];
        this.saveGameState();
        
        this.initializeEventListeners();
        this.updateDisplay();
    }
    
    initializeBoard() {
        // 創建 3x3 的空棋盤，每個位置是一個棋子堆疊陣列
        return Array(3).fill(null).map(() => Array(3).fill(null).map(() => []));
    }
    
    initializeEventListeners() {
        // 重新開始和上一步按鈕
        document.getElementById('restartBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastMove());
        
        // 規則說明按鈕
        document.getElementById('rulesBtn').addEventListener('click', () => this.showRules());
        document.getElementById('closeRules').addEventListener('click', () => this.hideRules());
        
        // 棋盤點擊事件
        document.getElementById('gameBoard').addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                this.handleCellClick(e.target);
            } else if (e.target.classList.contains('piece')) {
                this.handleBoardPieceClick(e.target);
            }
        });
        
        // 棋子區域點擊事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('piece') && e.target.closest('.player-pieces-area')) {
                this.handleSidePieceClick(e.target);
            }
        });
        
        // 勝利畫面按鈕
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
    }
    
    handleSidePieceClick(piece) {
        if (this.winner) return;
        
        const player = parseInt(piece.dataset.player);
        const size = parseInt(piece.dataset.size);
        const sizeNames = ['small', 'medium', 'large'];
        const sizeName = sizeNames[size];
        
        // 檢查是否還有該大小的棋子
        if (this.playerPieces[player][sizeName] <= 0) {
            return;
        }
        
        // 清除之前的選擇
        this.clearSelection();
        
        // 選中這個棋子
        this.selectedPiece = { player, size, fromSide: true };
        piece.classList.add('selected');
        
        // 高亮可放置的位置
        this.highlightValidMoves(size);
    }
    
    handleBoardPieceClick(piece) {
        if (this.winner) return;
        
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        const player = parseInt(piece.dataset.player);
        const size = parseInt(piece.dataset.size);
        
        // 檢查該棋子是否在最上層
        const cellStack = this.board[row][col];
        if (cellStack.length === 0 || cellStack[cellStack.length - 1].player !== player || cellStack[cellStack.length - 1].size !== size) {
            return;
        }
        
        // 清除之前的選擇
        this.clearSelection();
        
        // 選中這個棋子
        this.selectedPiece = { player, size, fromRow: row, fromCol: col };
        piece.classList.add('selected');
        
        // 高亮可移動的位置
        this.highlightValidMoves(size);
    }
    
    handleCellClick(cell) {
        if (this.winner || !this.selectedPiece) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (this.selectedPiece.fromSide) {
            // 放置新棋子
            this.placePiece(row, col);
        } else {
            // 移動現有棋子
            this.movePiece(this.selectedPiece.fromRow, this.selectedPiece.fromCol, row, col);
        }
    }
    
    placePiece(row, col) {
        const { player, size } = this.selectedPiece;
        const sizeNames = ['small', 'medium', 'large'];
        const sizeName = sizeNames[size];
        
        // 檢查是否可以放置
        if (!this.canPlacePiece(row, col, size)) {
            return;
        }
        
        // 放置棋子
        this.board[row][col].push({
            size: size,
            color: player === 0 ? 'red' : 'blue',
            player: player
        });
        
        // 減少棋子數量
        this.playerPieces[player][sizeName]--;
        
        // 檢查勝利
        if (this.checkWinner()) {
            this.handleGameEnd();
            return;
        }
        
        // 保存遊戲狀態到歷史記錄
        this.saveGameState();
        
        this.clearSelection();
        this.updateDisplay();
    }
    
    movePiece(fromRow, fromCol, toRow, toCol) {
        const { size } = this.selectedPiece;
        
        // 檢查移動的有效性
        if (!this.canPlacePiece(toRow, toCol, size)) {
            return;
        }
        
        // 執行移動
        const movedPiece = this.board[fromRow][fromCol].pop();
        this.board[toRow][toCol].push(movedPiece);
        
        // 檢查勝利
        if (this.checkWinner()) {
            this.handleGameEnd();
            return;
        }
        
        // 保存遊戲狀態到歷史記錄
        this.saveGameState();
        
        this.clearSelection();
        this.updateDisplay();
    }
    
    canPlacePiece(row, col, pieceSize) {
        const cell = this.board[row][col];
        if (cell.length === 0) return true; // 空格可以放置
        
        const topPiece = cell[cell.length - 1];
        return pieceSize > topPiece.size; // 只能放置更大的棋子
    }
    
    highlightValidMoves(pieceSize) {
        document.querySelectorAll('.cell').forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (this.canPlacePiece(row, col, pieceSize)) {
                cell.classList.add('valid-move');
            }
        });
    }
    
    clearSelection() {
        this.selectedPiece = null;
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));
    }
    
    checkWinner() {
        // 檢查所有可能的三連線
        const lines = [
            // 橫線
            [[0,0], [0,1], [0,2]],
            [[1,0], [1,1], [1,2]],
            [[2,0], [2,1], [2,2]],
            // 直線
            [[0,0], [1,0], [2,0]],
            [[0,1], [1,1], [2,1]],
            [[0,2], [1,2], [2,2]],
            // 斜線
            [[0,0], [1,1], [2,2]],
            [[0,2], [1,1], [2,0]]
        ];
        
        for (let line of lines) {
            const colors = line.map(([row, col]) => {
                const cell = this.board[row][col];
                return cell.length > 0 ? cell[cell.length - 1].color : null;
            });
            
            if (colors[0] && colors[0] === colors[1] && colors[1] === colors[2]) {
                this.winner = colors[0];
                return true;
            }
        }
        
        return false;
    }
    
    handleGameEnd() {
        const winnerText = this.winner === 'red' ? '紅色玩家' : '藍色玩家';
        document.getElementById('winnerTitle').textContent = `🎉 ${winnerText}獲勝！ 🎉`;
        document.getElementById('winnerSubtitle').textContent = '恭喜達成三連線！';
        document.getElementById('winnerScreen').classList.remove('hidden');
    }
    
    updateDisplay() {
        this.updateBoard();
        this.updateSidePieces();
    }
    
    updateBoard() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            cell.innerHTML = '';
            
            const cellStack = this.board[row][col];
            cellStack.forEach((piece, index) => {
                const pieceElement = document.createElement('div');
                pieceElement.className = `piece ${piece.color} size-${piece.size}`;
                pieceElement.textContent = ['小', '中', '大'][piece.size];
                pieceElement.style.zIndex = index + 1;
                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;
                pieceElement.dataset.size = piece.size;
                pieceElement.dataset.player = piece.player;
                
                cell.appendChild(pieceElement);
            });
        });
    }
    
    updateSidePieces() {
        // 更新側邊棋子顯示
        [0, 1].forEach(player => {
            ['small', 'medium', 'large'].forEach((sizeName, sizeIndex) => {
                const count = this.playerPieces[player][sizeName];
                const pieces = document.querySelectorAll(`[data-player="${player}"][data-size="${sizeIndex}"]`);
                
                pieces.forEach((piece, pieceIndex) => {
                    if (pieceIndex < count) {
                        piece.classList.remove('used');
                        piece.style.display = 'flex';
                    } else {
                        piece.classList.add('used');
                        piece.style.display = 'flex';
                    }
                });
            });
        });
    }
    
    newGame() {
        this.board = this.initializeBoard();
        this.winner = null;
        
        this.playerPieces = {
            0: { large: 2, medium: 2, small: 2 },
            1: { large: 2, medium: 2, small: 2 }
        };
        
        // 重置遊戲歷史
        this.gameHistory = [];
        this.saveGameState();
        
        this.clearSelection();
        document.getElementById('winnerScreen').classList.add('hidden');
        this.updateDisplay();
    }
    
    saveGameState() {
        // 深拷貝當前遊戲狀態
        const state = {
            board: JSON.parse(JSON.stringify(this.board)),
            playerPieces: JSON.parse(JSON.stringify(this.playerPieces))
        };
        
        this.gameHistory.push(state);
        
        // 限制歷史記錄長度
        if (this.gameHistory.length > 50) {
            this.gameHistory.shift();
        }
    }
    
    undoLastMove() {
        if (this.winner) {
            return;
        }
        
        if (this.gameHistory.length <= 1) {
            return;
        }
        
        // 移除當前狀態
        this.gameHistory.pop();
        
        // 恢復到上一個狀態
        const lastState = this.gameHistory[this.gameHistory.length - 1];
        this.board = JSON.parse(JSON.stringify(lastState.board));
        this.playerPieces = JSON.parse(JSON.stringify(lastState.playerPieces));
        
        this.clearSelection();
        this.updateDisplay();
    }
    
    showRules() {
        document.getElementById('rulesModal').classList.remove('hidden');
    }
    
    hideRules() {
        document.getElementById('rulesModal').classList.add('hidden');
    }
}

// 遊戲初始化
document.addEventListener('DOMContentLoaded', () => {
    new LocalGobbletGame();
});