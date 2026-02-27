import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 540;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 110;
const BALL_SIZE = 14;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const WIN_SCORE = 11;

const createInitialGame = () => ({
  leftPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
  rightPaddleY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
  ballX: CANVAS_WIDTH / 2,
  ballY: CANVAS_HEIGHT / 2,
  ballVX: INITIAL_BALL_SPEED,
  ballVY: INITIAL_BALL_SPEED * 0.6,
  playerScore: 0,
  aiScore: 0,
  running: false,
  winner: null
});

function App() {
  const canvasRef = useRef(null);
  const [game, setGame] = useState(createInitialGame);
  const [keys, setKeys] = useState({ up: false, down: false });

  const difficulty = useMemo(() => ({
    aiSpeed: 5.4,
    aiReaction: 0.12,
    spinFactor: 0.3
  }), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        setKeys((prev) => ({ ...prev, up: true }));
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        setKeys((prev) => ({ ...prev, down: true }));
      }
      if (event.code === 'Space') {
        event.preventDefault();
        setGame((prev) => ({ ...prev, running: prev.winner ? false : !prev.running }));
      }
      if (event.key.toLowerCase() === 'r') {
        setGame(createInitialGame());
      }
    };

    const onKeyUp = (event) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        setKeys((prev) => ({ ...prev, up: false }));
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        setKeys((prev) => ({ ...prev, down: false }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    let frameId;

    const tick = () => {
      setGame((prev) => {
        if (!prev.running || prev.winner) {
          return prev;
        }

        let {
          leftPaddleY,
          rightPaddleY,
          ballX,
          ballY,
          ballVX,
          ballVY,
          playerScore,
          aiScore
        } = prev;

        if (keys.up) {
          leftPaddleY -= PADDLE_SPEED;
        }
        if (keys.down) {
          leftPaddleY += PADDLE_SPEED;
        }
        leftPaddleY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, leftPaddleY));

        const aiTargetY = ballY - PADDLE_HEIGHT / 2 + BALL_SIZE / 2;
        rightPaddleY += (aiTargetY - rightPaddleY) * difficulty.aiReaction;
        const aiCenter = rightPaddleY + PADDLE_HEIGHT / 2;
        if (aiCenter < ballY - 12) rightPaddleY += difficulty.aiSpeed;
        if (aiCenter > ballY + 12) rightPaddleY -= difficulty.aiSpeed;
        rightPaddleY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, rightPaddleY));

        ballX += ballVX;
        ballY += ballVY;

        if (ballY <= 0 || ballY + BALL_SIZE >= CANVAS_HEIGHT) {
          ballVY *= -1;
          ballY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, ballY));
        }

        const leftPaddleX = 36;
        const rightPaddleX = CANVAS_WIDTH - 36 - PADDLE_WIDTH;

        const intersectsLeft =
          ballX <= leftPaddleX + PADDLE_WIDTH &&
          ballX + BALL_SIZE >= leftPaddleX &&
          ballY + BALL_SIZE >= leftPaddleY &&
          ballY <= leftPaddleY + PADDLE_HEIGHT;

        if (intersectsLeft && ballVX < 0) {
          ballX = leftPaddleX + PADDLE_WIDTH;
          ballVX = Math.abs(ballVX) * 1.03;
          const offset = (ballY + BALL_SIZE / 2 - (leftPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          ballVY += offset * difficulty.spinFactor * 4;
        }

        const intersectsRight =
          ballX + BALL_SIZE >= rightPaddleX &&
          ballX <= rightPaddleX + PADDLE_WIDTH &&
          ballY + BALL_SIZE >= rightPaddleY &&
          ballY <= rightPaddleY + PADDLE_HEIGHT;

        if (intersectsRight && ballVX > 0) {
          ballX = rightPaddleX - BALL_SIZE;
          ballVX = -Math.abs(ballVX) * 1.03;
          const offset = (ballY + BALL_SIZE / 2 - (rightPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          ballVY += offset * difficulty.spinFactor * 3;
        }

        if (ballX < -BALL_SIZE) {
          aiScore += 1;
          ballX = CANVAS_WIDTH / 2;
          ballY = CANVAS_HEIGHT / 2;
          ballVX = INITIAL_BALL_SPEED;
          ballVY = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.75 : -0.75);
        }

        if (ballX > CANVAS_WIDTH + BALL_SIZE) {
          playerScore += 1;
          ballX = CANVAS_WIDTH / 2;
          ballY = CANVAS_HEIGHT / 2;
          ballVX = -INITIAL_BALL_SPEED;
          ballVY = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 0.75 : -0.75);
        }

        const winner =
          playerScore >= WIN_SCORE
            ? 'Você venceu!'
            : aiScore >= WIN_SCORE
              ? 'IA venceu!'
              : null;

        return {
          ...prev,
          leftPaddleY,
          rightPaddleY,
          ballX,
          ballY,
          ballVX,
          ballVY,
          playerScore,
          aiScore,
          winner,
          running: winner ? false : prev.running
        };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [difficulty, keys]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;

    context.fillStyle = '#04040e';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    context.setLineDash([10, 14]);
    context.beginPath();
    context.moveTo(CANVAS_WIDTH / 2, 0);
    context.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = '#f5f5f5';
    context.fillRect(36, game.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    context.fillRect(CANVAS_WIDTH - 36 - PADDLE_WIDTH, game.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    context.fillStyle = '#ffd700';
    context.fillRect(game.ballX, game.ballY, BALL_SIZE, BALL_SIZE);
  }, [game]);

  return (
    <main className="pong-page">
      <h1>🏓 Atari Pong</h1>
      <p>Use W/S ou ↑/↓ para mover a raquete. Espaço pausa e R reinicia.</p>

      <section className="scoreboard">
        <div>
          <span>Jogador</span>
          <strong>{game.playerScore}</strong>
        </div>
        <div>
          <span>CPU</span>
          <strong>{game.aiScore}</strong>
        </div>
      </section>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pong-canvas"
      />

      <section className="controls">
        <button type="button" onClick={() => setGame((prev) => ({ ...prev, running: !prev.running }))}>
          {game.running ? 'Pausar' : 'Jogar'}
        </button>
        <button type="button" onClick={() => setGame(createInitialGame())}>
          Reiniciar
        </button>
      </section>

      {game.winner && <p className="winner-banner">{game.winner} Pressione R para nova partida.</p>}
    </main>
  );
}

export default App;
