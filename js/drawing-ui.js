export class DrawingBoardUI {
  constructor(board) {
    this._board = board;
    this._container = null;
    this._canvas = null;
    this._ctx = null;
    this._resizeObserver = null;
    this._pointerUpHandler = null;
    this._drawing = false;
    this._lastPoint = null;
    this._history = [];
    this._color = '#1f2937';
    this._size = 4;
    this._tool = 'pen';

    board.onStroke = (stroke) => this._applyStroke(stroke);
    board.onClear = () => this._applyClear();
    board.onLockChange = () => this._syncLockUI();
  }

  mount(container) {
    this._container = container;
    container.innerHTML = `
      <div class="drawing-board">
        <div class="drawing-toolbar">
          <input type="color" class="drawing-color" value="#1f2937" title="Color">
          <input type="range" class="drawing-size" min="1" max="24" value="4" title="Brush size">
          <button type="button" class="drawing-tool-btn drawing-tool-btn--active" data-tool="pen">Pen</button>
          <button type="button" class="drawing-tool-btn" data-tool="eraser">Eraser</button>
          <button type="button" class="drawing-clear-btn">Clear</button>
          ${this._board.isHost ? '<button type="button" class="drawing-lock-btn">Lock canvas</button>' : ''}
          <span class="drawing-lock-banner" hidden>Host has locked the canvas.</span>
        </div>
        <canvas class="drawing-canvas"></canvas>
      </div>
    `;

    this._canvas = container.querySelector('.drawing-canvas');
    this._ctx = this._canvas.getContext('2d');
    this._colorInput = container.querySelector('.drawing-color');
    this._sizeInput = container.querySelector('.drawing-size');
    this._clearBtn = container.querySelector('.drawing-clear-btn');
    this._lockBtn = container.querySelector('.drawing-lock-btn');
    this._lockBanner = container.querySelector('.drawing-lock-banner');
    this._toolButtons = [...container.querySelectorAll('.drawing-tool-btn')];

    this._colorInput.addEventListener('input', this._onColorInput.bind(this));
    this._sizeInput.addEventListener('input', this._onSizeInput.bind(this));
    for (const btn of this._toolButtons) {
      btn.addEventListener('click', this._onToolButtonClick.bind(this, btn));
    }
    this._clearBtn.addEventListener('click', this._onClearClick.bind(this));
    this._lockBtn?.addEventListener('click', this._onLockClick.bind(this));

    this._canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this._canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
    this._pointerUpHandler = this._onPointerUp.bind(this);
    window.addEventListener('pointerup', this._pointerUpHandler);

    this._resizeObserver = new ResizeObserver(this._onResize.bind(this));
    this._resizeObserver.observe(this._canvas);

    this._syncLockUI();
  }

  unmount() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._pointerUpHandler) {
      window.removeEventListener('pointerup', this._pointerUpHandler);
      this._pointerUpHandler = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._canvas = null;
    this._ctx = null;
    this._history = [];
  }

  _onColorInput() {
    this._color = this._colorInput.value;
  }

  _onSizeInput() {
    this._size = Number(this._sizeInput.value);
  }

  _onToolButtonClick(btn) {
    this._tool = btn.dataset.tool;
    for (const other of this._toolButtons) {
      other.classList.toggle('drawing-tool-btn--active', other === btn);
    }
  }

  _onClearClick() {
    this._applyClear();
    this._board.sendClear();
  }

  _onLockClick() {
    this._board.setLocked(!this._board.locked);
  }

  _onResize() {
    if (!this._canvas) return;
    const { clientWidth, clientHeight } = this._canvas;
    if (!clientWidth || !clientHeight) return;
    this._canvas.width = clientWidth;
    this._canvas.height = clientHeight;
    this._redrawHistory();
  }

  _onPointerDown(event) {
    if (!this._board.canDraw()) return;
    this._drawing = true;
    this._canvas.setPointerCapture(event.pointerId);
    this._lastPoint = this._toNormalizedPoint(event);
  }

  _onPointerMove(event) {
    if (!this._drawing) return;
    const point = this._toNormalizedPoint(event);
    const stroke = {
      x0: this._lastPoint.x,
      y0: this._lastPoint.y,
      x1: point.x,
      y1: point.y,
      color: this._color,
      size: this._size,
      tool: this._tool
    };
    this._applyStroke(stroke);
    this._board.sendStroke(stroke);
    this._lastPoint = point;
  }

  _onPointerUp() {
    this._drawing = false;
    this._lastPoint = null;
  }

  _toNormalizedPoint(event) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  _applyStroke(stroke) {
    this._history.push(stroke);
    this._drawSegment(stroke);
  }

  _drawSegment(stroke) {
    if (!this._ctx) return;
    const { width, height } = this._canvas;
    const ctx = this._ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
    ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
    ctx.stroke();
    ctx.restore();
  }

  _redrawHistory() {
    if (!this._ctx) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    for (const stroke of this._history) this._drawSegment(stroke);
  }

  _applyClear() {
    this._history = [];
    this._ctx?.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  _syncLockUI() {
    const locked = this._board.locked;
    if (this._lockBtn) this._lockBtn.textContent = locked ? 'Unlock canvas' : 'Lock canvas';
    const blocked = !this._board.canDraw();
    if (this._lockBanner) this._lockBanner.hidden = !blocked;
    this._canvas?.classList.toggle('drawing-canvas--disabled', blocked);
  }
}
