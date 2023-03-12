window.onload = () => {
  const config = {
    colors: {
      background: '#227C9D',
      emptySquare: '#584B53',
      activeSquare: '#FFCB77',
      inactiveSquare: '#17C3B2',
    },
    width: 10,
    height: 16,
    gameSpeed: 1000, // ms
    redrawSpeed: 1000 / 60, // ms
    figures: [
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 1],
      ],
      [
        [1, 0, 0],
        [1, 1, 1],
      ],
      [
        [1, 1, 1, 1],
      ],
      [
        [1],
        [1],
        [1],
        [1],
      ],
      [
        [1],
      ]
    ]
  };

  const state = {
    filledElements: createEmptyMatrix(config.width, config.height),
    currentFigure: null, // { shape: [[1,1], [1,1]], position: {x,y}, rotation: 0, rotatedShape: [[1,1], [1,1]], firstPosition: true }
    lastTick: Date.now(),
    pause: false,
    score: 0,
    touchDownPosition: null,
  }

  let squareSize = 1; // px
  let ps = () => squareSize / 10; // pixel size

  const canvas = document.querySelector('canvas');
  resizeCanvas();
  const ctx = canvas.getContext('2d');
  initEventListeners();

  const aciton = () => {
    if (state.pause) return;

    drawMesh();
    drawCurrentFigure();
    drawFallenFigures();

    if (Date.now() - state.lastTick > config.gameSpeed) {
      fallFigure();
      removeLines();
      state.lastTick = Date.now();
    }

    setTimeout(() => {
      requestAnimationFrame(aciton);
    }, config.redrawSpeed);
  };
  requestAnimationFrame(aciton);

  function resizeCanvas() {
    const canvasContainerWidth = document.querySelector('#canvas-container').clientWidth - 8;
    const canvasContainerHeight = document.querySelector('#canvas-container').clientHeight;
    const fieldRatio = config.width / config.height;
    const canvasHeight = canvasContainerHeight - 8; // px
    const canvasWidth = canvasHeight * fieldRatio;

    if (canvasContainerWidth < canvasWidth) {
      canvas.width = canvasContainerWidth - 4;
      canvas.height = canvas.width / fieldRatio;
    } else {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight; // px;
    }

    squareSize = canvas.width / config.width;
  }

  // key handlers
  function pressLeft() {
    if (canMoveLeft(state.currentFigure)) {
      --state.currentFigure.position.x;
    }
  }

  function pressRight() {
    if (canMoveRight(state.currentFigure)) {
      ++state.currentFigure.position.x;
    }
  }

  function pressDown() {
    if (canFall(state.currentFigure)) {
      ++state.currentFigure.position.y;
      state.currentFigure.firstPosition = false;
    }
  }

  function pressUp() {
    if (canRotate(state.currentFigure)) {
      state.currentFigure.rotation = (state.currentFigure.rotation + 1) % 4;
      state.currentFigure.rotatedShape = getRotatedShapeOfFigure(state.currentFigure);
    }
  }

  // drawing elements
  function removeLines() {
    let removedLines = 0;

    for (let i = 0; i < config.height; i++) {
      if (state.filledElements.every(line => line[i] == 1)) {
        state.filledElements.forEach(line => line.splice(i, 1));
        state.filledElements.forEach(line => line.unshift(0));
        removedLines++;
      }
    }

    if (removedLines > 0) {
      const rawScore = removedLines * 100 * Math.sqrt(removedLines)
      state.score += Math.round(rawScore / 10) * 10;
      document.querySelector('#score').innerText = state.score;
    }
  }

  function drawCurrentFigure() {
    if (state.currentFigure) drawFigure();
    if (!state.currentFigure) {
      const figure = getRandomFigure();
      const tl = Math.round((config.width - figure[0].length) / 2); // top left position of figure
      state.currentFigure = {
        shape: figure,
        position: { x: tl, y: 0 },
        rotation: 0,
        rotatedShape: figure,
        firstPosition: true
      };
      drawFigure();
    }
  }

  function drawFallenFigures() {
    for (let i = 0; i < config.width; i++) {
      for (let j = 0; j < config.height; j++) {
        if (state.filledElements[i][j] == 1) {
          drawSquare(i, j, config.colors.inactiveSquare);
        }
      }
    }
  };

  function drawFigure() {
    const { x, y } = state.currentFigure.position;
    const { rotatedShape } = state.currentFigure;

    for (let i = 0; i < rotatedShape.length; i++) {
      for (let j = 0; j < rotatedShape[i].length; j++) {
        if (rotatedShape[i][j] == 1) {
          drawSquare(x + j, y + i, config.colors.activeSquare);
        }
      }
    }
  }

  function drawSquare(_x, _y, color) {
    const size = squareSize;
    const { x, y } = getAbsolutePosition(_x, _y);
    const p = ps() / 2;

    ctx.fillStyle = config.colors.background;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = color;
    ctx.fillRect(x + p, y + p, size - 2*p, size - 2*p);
  }

  function drawMesh() {
    for (let i = 0; i < config.width; i++) {
      for (let j = 0; j < config.height; j++) {
        drawSquare(i, j, config.colors.emptySquare);
      }
    }
  }

  // calculations
  function fallFigure() {
    if (canFall(state.currentFigure)) {
      state.currentFigure.position.y++;
      state.currentFigure.firstPosition = false;
    } else {
      if (state.currentFigure.firstPosition) {
        state.pause = true;
        console.log('game over');
      }
      const coordinates = getFigureCoordinates(state.currentFigure);
      coordinates.forEach(({ x, y }) => state.filledElements[x][y] = 1);
      state.currentFigure = null;
    }
  }

  function canMoveLeft(figure) {
    if (!figure) return false;
    const coordinates = getFigureCoordinates(figure);
    return coordinates.every(({ x, y }) => {
      return state.filledElements[x - 1] && state.filledElements[x - 1][y] == 0;
    });
  }

  function canMoveRight(figure) {
    if (!figure) return false;
    const coordinates = getFigureCoordinates(figure);
    return coordinates.every(({ x, y }) => {
      return state.filledElements[x + 1] && state.filledElements[x + 1][y] == 0;
    });
  }

  function canFall(figure) {
    if (!figure) return false;
    let canFall = true;
    const coordinates = getFigureCoordinates(figure);
    coordinates.forEach(({ x, y }) => {
      if (y == config.height - 1) canFall = false;
      if (state.filledElements[x][y + 1] != 0) canFall = false;
    });
    return canFall;
  }

  function canRotate(figure) {
    const rotatedShape = getRotatedShapeOfFigure(figure, state.currentFigure.rotation + 1);
    const coordinates = getFigureCoordinates({ ...figure, rotatedShape });
    return coordinates.every(({ x, y }) => {
      return state.filledElements[x] && state.filledElements[x][y] == 0;
    });
  }

  function getAbsolutePosition(x, y) {
    return {
      x: x * squareSize,
      y: y * squareSize,
    };
  }

  function createEmptyMatrix(width, height) {
    const a = [];
    for (let i = 0; i < width; i++) {
      const b = [];
      for (let j = 0; j < height; j++) {
        b.push(0);
      }
      a.push(b);
    }

    return a;
  }

  function getRandomFigure() {
    const index = Math.floor(Math.random() * config.figures.length);
    return config.figures[index];
  }

  function getFigureCoordinates(figure) {
    if (!figure) return [];
    const { x, y } = figure.position;
    const { rotatedShape } = figure;
    const coordinates = [];
    for (let i = 0; i < rotatedShape.length; i++) {
      for (let j = 0; j < rotatedShape[i].length; j++) {
        if (rotatedShape[i][j] == 1) {
          coordinates.push({ x: x + j, y: y + i });
        }
      }
    }

    return coordinates;
  }

  function getRotatedShapeOfFigure(figure, arbitraryRotation) {
    const { shape } = figure;
    const rotation = arbitraryRotation || figure.rotation;
    let rotatedShape = [];

    if (rotation == 0) return shape;
    if (rotation == 1) {
      rotatedShape = createEmptyMatrix(shape[0].length, shape.length);

      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          rotatedShape[j][shape.length - 1 - i] = shape[i][j];
        }
      }
      return rotatedShape;
    }
    if (rotation == 2) {
      rotatedShape = createEmptyMatrix(shape.length, shape[0].length);

      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          rotatedShape[shape.length - 1 - i][shape[i].length - 1 - j] = shape[i][j];
        }
      }
      return rotatedShape;
    }
    if (rotation == 3) {
      rotatedShape = createEmptyMatrix(shape[0].length, shape.length);

      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          rotatedShape[shape[i].length - 1 - j][i] = shape[i][j];
        }
      }
      return rotatedShape;
    }

    return shape;
  }

  // event listeners
  function initEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        pressLeft(true);
      } else if (e.key === 'ArrowRight') {
        pressRight(true);
      } else if (e.key === 'ArrowDown') {
        pressDown(true);
      } else if (e.key === 'ArrowUp') {
        pressUp(true);
      }
    });
  }

  window.addEventListener('resize', (e) => {
    resizeCanvas();
  });

  document.body.addEventListener('touchstart', (e) => {
    const { clientX, clientY } = e.touches[0];
    state.touchDownPosition = { x: clientX, y: clientY };
  });

  document.body.addEventListener('touchend', (e) => {
    const { clientX, clientY } = e.changedTouches[0];
    const { x, y } = state.touchDownPosition;
    if (clientX == x && clientY == y) {
      pressUp(true);
    }
  });

  document.body.addEventListener('touchmove', (e) => {
    const { clientX, clientY } = e.touches[0];
    const { x, y } = state.touchDownPosition;
    const trashold = ps() * 6;
    const dx = clientX - x;
    const dy = clientY - y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > trashold) {
        pressRight(true);
        state.touchDownPosition.x = clientX;
        state.touchDownPosition.y = clientY;
      } else if (dx < -trashold) {
        pressLeft(true);
        state.touchDownPosition.x = clientX;
        state.touchDownPosition.y = clientY;
      }
    } else {
      if (dy > trashold) {
        pressDown(true);
        state.touchDownPosition.x = clientX;
        state.touchDownPosition.y = clientY;
      }
    }
  });
}
