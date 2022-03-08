consts = {
	backgroundColor: '#000',
	numOfStreams: 100,
	minStreamSpeed: 1,
	maxStreamSpeed: 3,
	minNumOfDrops: 5,
	maxNumOfDrops: 25,
	minDropSize: 6,
	maxDropSize: 20,
	baseDropColor: 160,
	colorChange: 15,
	minLum: 10,
	maxLum: 50,
	lumChange: 15,
	lumFadeRate: 0.2,
	msgSpeed: 3,
	msgTextSize: 25,
};
vars = {
	resizeEventAttached: false,
	boardSize: 0,
	ctx: null,
	streams: [],
	messages: [],
	gameResultEventTime: 0,
	processMoves: true
}
elms = {
	chessBoard: null,
	moveList: null,
	main: null,
	canvas: null,
};

// drop ----------------------------------------------------------------------------------------------------------------

function Drop() {
	this.init = function (details) {
		this.dropIndex = details.dropIndex;
		this.dropsInStream = details.dropsInStream;
		this.closeness = details.closeness;
		this.size = details.size;
		this.ax = 0;
		this.ay = 0;
		this.vx = 0;
		this.vy = details.speed;
		this.x = details.x;
		this.y = details.y;
		this.maxLum = details.dropIndex === 0 ? 100 : Math.max(Math.floor(consts.maxLum * details.closeness), consts.minLum);
		this.lum = this.maxLum;
		this.chooseChar();
		this.baseColor = consts.baseDropColor;
		this.color = this.baseColor;
	};
	this.chooseChar = function () {
		this.char = String.fromCharCode(0x30a0 + Math.random() * 96);
	};
	this.change = function () {
		const val = Math.random();
		if (val < 0.2) {
			let newLum = this.lum + rnd(-consts.lumChange, consts.lumChange, true);
			newLum = Math.min(Math.max(newLum, 0), 100);
			this.lum = newLum;
		} else if (val < 0.4) {
			this.lum = consts.minLum;
		} else if (val < 0.8) {
			this.color = this.baseColor + rnd(-consts.colorChange, consts.colorChange, true);
		} else {
			this.chooseChar();
			this.lum = 90;
		}
	};
	this.draw = function() {
		if (this.color !== 0 && Math.random() < 0.005) {
			this.change();
		}
		vars.ctx.fillStyle = `hsl(${Math.floor(this.color)}, 100%, ${Math.floor(
		this.lum
		)}%)`;
		if (this.lum > consts.maxLum) {
			this.lum -= consts.lumFadeRate;
		}
		vars.ctx.font = `bold ${this.size}px sans-serif`;
		vars.ctx.fillText(this.char, Math.floor(this.x), Math.floor(this.y));
	};
	this.move = function() {
		this.vx += this.ax;
		this.vy += this.ay;
		this.x += this.vx;
		this.y += this.vy;
	};
}

// stream --------------------------------------------------------------------------------------------------------------

function Stream(numOfDrops) {
	this.drops = [];
	for (let i = 0; i < numOfDrops; i++) {
		const drop = new Drop();
		this.drops.push(drop);
	}
	this.init = function () {
		const x = rnd(0, vars.boardSize - consts.maxDropSize, true);
		const y = -consts.maxDropSize;
		const closeness = Math.random();
		const size = Math.floor(consts.minDropSize + (consts.maxDropSize - consts.minDropSize) * closeness);
		this.speed = consts.minStreamSpeed + (consts.maxStreamSpeed - consts.minStreamSpeed) * closeness;
		this.drops.forEach((drop, index) => {
			drop.init({
				dropIndex: index,
				dropsInStream: this.drops.length,
				closeness,
				size,
				x,
				y: y -index * size,
				speed: this.speed,
			});
		});
	};
	this.draw = function () {
		this.drops.forEach((drop) => {
			if (drop.y >= -consts.maxDropSize && drop.y <= vars.boardSize + consts.maxDropSize) {
				drop.draw();
			}
		});
	};

	this.move = function () {
		if (this.drops[this.drops.length - 1].y > vars.boardSize + consts.maxDropSize) {
			this.init();
		} else {
			this.drops.forEach((drop) => {
				drop.move();
			});
		}
	};
}

// message -------------------------------------------------------------------------------------------------------------

function Message(details) {
	this.details = details;
	this.size = Math.floor(vars.boardSize / 8);
	this.speed = consts.msgSpeed;
	this.x = - details.msgText.length * consts.msgTextSize;
	this.y = rnd(vars.boardSize / 4, vars.boardSize * 3 / 4, true);
	this.draw = function () {
		vars.ctx.font = `bold ${this.size}px sans-serif`;
		if (this.details.isCheckmate || this.details.isCheck) {
			vars.ctx.fillStyle = `hsl(0, 100%, 50%)`;
		} else if (this.details.isTake || this.details.isPromotion) {
			vars.ctx.fillStyle = `hsl(25, 100%, 50%)`;
		} else {
			vars.ctx.fillStyle = `hsl(160, 100%, 30%)`;
		}
		vars.ctx.shadowBlur = 0;
		vars.ctx.fillText(this.details.msgText, Math.floor(this.x), Math.floor(this.y));
	};
	this.move = function () {
		this.x += this.speed;
		return this.x < vars.boardSize + this.details.msgText.length * consts.msgTextSize;
	};
}

// setup ---------------------------------------------------------------------------------------------------------------

function addFonts() {
	const styleElm = document.createElement('style');
	styleElm.textContent = `
	@font-face { font-family: 'Play'; font-style: normal; font-weight: 400; src: local('Play Regular'), local('Play-Regular'), url("${chrome.runtime.getURL('font/play-400.woff2')}"), url("${chrome.runtime.getURL('font/play-400.woff')}"); }
	@font-face { font-family: 'Play'; font-style: normal; font-weight: 700; src: local('Play Bold'), local('Play-Bold'), url("${chrome.runtime.getURL('font/play-700.woff2')}"), url("${chrome.runtime.getURL('font/play-700.woff')}"); }
	`;
	document.head.appendChild(styleElm);
}

function rnd(min, max, floor) {
	let result = min + Math.random() * (max - min);
	return floor ? Math.floor(result) : result;
}

function getPixelRatio() {
	const ctx = document.createElement('canvas').getContext('2d'),
	dpr = window.devicePixelRatio || 1,
	bsr =
	ctx.webkitBackingStorePixelRatio ||
	ctx.mozBackingStorePixelRatio ||
	ctx.msBackingStorePixelRatio ||
	ctx.oBackingStorePixelRatio ||
	ctx.backingStorePixelRatio ||
	1;
	return dpr / bsr;
}

function handleChessBoard() {
	elms.chessBoard = document.querySelector('chess-board.board');
	//elms.chessBoard.style.backgroundImage = `url("${chrome.extension.getURL('img/bg.jpg')}")`;
	const coordinatesElm = elms.chessBoard.querySelector('.coordinates:not(.outside)');
	if (coordinatesElm) {
		coordinatesElm.classList.add('outside');
	}
}

function onMoveListChanged(mutationsList) {
	for (let mutation of mutationsList) {
		if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
			for (let node of mutation.addedNodes) {
				if (node.classList.contains('game-result')) {
					vars.gameResultEventTime = Date.now();
					setTimeout(() => {
						vars.gameResultEventTime = 0;
						vars.processMoves = true;
					}, 3000);
					return;
				}
				if (vars.processMoves && !node.classList.contains('move') && !node.classList.contains('time-white') && !node.classList.contains('time-black')) {
					let msgText = '';
					if (node.querySelector('[class*="rook-"]')) {
						msgText = 'R' + msgText;
					} else if (node.querySelector('[class*="knight-"]')) {
						msgText = 'N' + msgText;
					} else if (node.querySelector('[class*="bishop-"]')) {
						msgText = 'B' + msgText;
					} else if (node.querySelector('[class*="queen-"]')) {
						msgText = 'Q' + msgText;
					} else if (node.querySelector('[class*="king-"]')) {
						msgText = 'K' + msgText;
					}
					msgText += node.textContent;
					const isWhite = node.classList.contains('white');
					const isTake = msgText.includes('x');
					const isPromotion = msgText.includes('=');
					const isCheck = msgText.includes('+');
					const isCheckmate = msgText.includes('#');
					const details = {
						msgText,
						isWhite,
						isTake,
						isPromotion,
						isCheck,
						isCheckmate,
					}
					const msg = new Message(details);
					vars.messages.push(msg);
					elms.chessBoard.classList.remove('wk-danger', 'bk-danger');
					if (!isWhite && (isCheck || isCheckmate)) {
						elms.chessBoard.classList.add('wk-danger');
					} else if (isWhite && (isCheck || isCheckmate)) {
						elms.chessBoard.classList.add('bk-danger');
					}
					if (Date.now() - vars.gameResultEventTime < 3000) {
						vars.processMoves = false;
					}
				}
			}
		}
	}
}

function handleMoveList() {
	elms.moveList = document.querySelector('.vertical-move-list');
	const observer = new MutationObserver(onMoveListChanged);
	const config = { attributes: false, childList: true, subtree: true };
	observer.observe(elms.moveList, config);
	//observer.disconnect();
}

function createMainElement() {
	elms.main = document.createElement('div');
	elms.main.setAttribute('id', 'cdr-main');
	elms.main.classList.add('cdr-main');
	elms.chessBoard.prepend(elms.main);
}

function createCanvasElement() {
	elms.canvas = document.createElement('canvas');
	elms.canvas.setAttribute('id', 'cdr-canvas');
	elms.canvas.classList.add('cdr-canvas');
	elms.main.appendChild(elms.canvas);
	vars.ctx = elms.canvas.getContext('2d');
}

function updateBoardSize() {
	vars.boardSize = Math.floor(elms.chessBoard.clientWidth);
	elms.chessBoard.style.setProperty('--cdr-board-size', `${vars.boardSize}px`);
	elms.chessBoard.style.setProperty('--cdr-font-size', `${Math.floor(elms.chessBoard.clientWidth / 8)}px`);
	const ratio = getPixelRatio();
	//elms.canvas.setAttribute('width', vars.boardSize * ratio);
	//elms.canvas.setAttribute('height', vars.boardSize * ratio);
	elms.canvas.setAttribute('width', vars.boardSize);
	elms.canvas.setAttribute('height', vars.boardSize);
	elms.canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createStreams() {
	vars.streams = [];
	for (let i = 0; i < consts.numOfStreams; i++) {
		const numOfDrops = rnd(consts.minNumOfDrops, consts.maxNumOfDrops, true);
		const stream = new Stream(numOfDrops);
		stream.init();
		vars.streams.push(stream);
	}
}

function clearMessages() {
	vars.messages = [];
}

function setup() {
	addFonts();
	handleChessBoard();
	handleMoveList();
	createMainElement();
	createCanvasElement();
	updateBoardSize();
	if (!vars.resizeEventAttached) {
		window.addEventListener('resize', updateBoardSize);
		vars.resizeEventAttached = true;
	}
	createStreams();
	clearMessages();
	vars.gameResultEventTime = 0;
	vars.processMoves = true;
}

// draw ----------------------------------------------------------------------------------------------------------------

function clear() {
	vars.ctx.fillStyle = consts.backgroundColor;
	vars.ctx.fillRect(0, 0, vars.boardSize, vars.boardSize);
}

function draw() {
	clear();
	vars.streams.forEach(stream => {
		stream.draw();
		stream.move();
	});
	let msgStillOnScreen = true;
	vars.messages.forEach(msg => {
		msg.draw();
		msgStillOnScreen = msg.move();
	});
	if (!msgStillOnScreen) {
		vars.messages.shift();
	}
	window.requestAnimationFrame(draw);
}

// start ---------------------------------------------------------------------------------------------------------------

setInterval(() => {
	const isGameScreen = document.querySelector('chess-board.board') && document.querySelector('.vertical-move-list');
	if (!isGameScreen) {
		return;
	}
	const hasCdrMain = document.getElementById('cdr-main');
	if (hasCdrMain) {
		return;
	}
	setup();
	draw();
	elms.chessBoard.style.opacity = '1';
}, 3000);
