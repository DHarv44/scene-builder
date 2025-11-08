// Title Card component for spaghetti western-style credits
// Copied from Low Sun game

export interface TitleCardConfig {
  text: string;
  subtitle?: string;
  fontSize: number;
  subtitleSize?: number;
  font?: string;
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
  position: { x: number | string; y: number | string };
  textAlign?: 'left' | 'center' | 'right';
  fadeInStart: number;
  fadeInDuration?: number;
  holdDuration: number;
  fadeOutDuration?: number;
  letterSpacing?: number;
}

export class TitleCard {
  private alpha: number = 0;
  private state: 'waiting' | 'fading-in' | 'holding' | 'fading-out' | 'complete' = 'waiting';
  private stateTime: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    private config: TitleCardConfig,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  update(sceneTime: number, dt: number): void {
    const fadeInDuration = this.config.fadeInDuration ?? 2000;
    const fadeOutDuration = this.config.fadeOutDuration ?? 6000;

    if (this.state === 'waiting') {
      if (sceneTime >= this.config.fadeInStart) {
        this.state = 'fading-in';
        this.stateTime = 0;
      }
    } else if (this.state === 'fading-in') {
      this.stateTime += dt;
      this.alpha = Math.min(1, this.stateTime / fadeInDuration);

      if (this.stateTime >= fadeInDuration) {
        this.state = 'holding';
        this.stateTime = 0;
        this.alpha = 1;
      }
    } else if (this.state === 'holding') {
      this.stateTime += dt;

      if (this.stateTime >= this.config.holdDuration) {
        this.state = 'fading-out';
        this.stateTime = 0;
      }
    } else if (this.state === 'fading-out') {
      this.stateTime += dt;
      this.alpha = Math.max(0, 1 - (this.stateTime / fadeOutDuration));

      if (this.stateTime >= fadeOutDuration) {
        this.state = 'complete';
        this.alpha = 0;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Parse position (supports %, px, and calc() expressions)
    const parsePosition = (value: string | number, dimension: number): number => {
      if (typeof value === 'number') return value;

      // Handle calc() expressions like "calc(25% - 50px)"
      if (value.startsWith('calc(')) {
        const expr = value.slice(5, -1); // Remove "calc(" and ")"
        const parts = expr.split(/([+-])/);
        let result = 0;
        let operator = '+';

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed === '+' || trimmed === '-') {
            operator = trimmed;
          } else if (trimmed.endsWith('%')) {
            const percent = parseFloat(trimmed) / 100 * dimension;
            result = operator === '+' ? result + percent : result - percent;
          } else if (trimmed.endsWith('px')) {
            const pixels = parseFloat(trimmed);
            result = operator === '+' ? result + pixels : result - pixels;
          } else if (trimmed) {
            const num = parseFloat(trimmed);
            result = operator === '+' ? result + num : result - num;
          }
        }
        return result;
      }

      // Handle simple percentage
      if (value.endsWith('%')) {
        return (parseFloat(value) / 100) * dimension;
      }

      return parseFloat(value);
    };

    const x = parsePosition(this.config.position.x, this.canvasWidth);
    const y = parsePosition(this.config.position.y, this.canvasHeight);

    // Set font and text properties
    const font = this.config.font ?? 'Cinzel, serif';
    const color = this.config.color ?? '#e9e2d0'; // Warmer cream color
    const outlineColor = this.config.outlineColor ?? '#0f0e0c'; // Deep black-brown
    const outlineWidth = this.config.outlineWidth ?? 2;
    const textAlign = this.config.textAlign ?? 'center';

    // Use Black (900) for large titles, Bold (700) for smaller text
    const fontWeight = this.config.fontSize >= 32 ? '900' : '700';
    ctx.font = `${fontWeight} ${this.config.fontSize}px ${font}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';

    // Apply letter spacing if specified
    if (this.config.letterSpacing) {
      const spacing = this.config.letterSpacing;
      const chars = this.config.text.split('');
      const totalWidth = chars.reduce((sum, char) => {
        return sum + ctx.measureText(char).width + spacing;
      }, -spacing); // Remove last spacing

      let currentX = textAlign === 'center' ? x - totalWidth / 2 : x;

      chars.forEach((char) => {
        // Draw outline
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.strokeText(char, currentX, y);

        // Draw fill
        ctx.fillStyle = color;
        ctx.fillText(char, currentX, y);

        currentX += ctx.measureText(char).width + spacing;
      });
    } else {
      // Draw outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth;
      ctx.strokeText(this.config.text, x, y);

      // Draw fill
      ctx.fillStyle = color;
      ctx.fillText(this.config.text, x, y);
    }

    // Draw subtitle if present
    if (this.config.subtitle && this.config.subtitleSize) {
      const subtitleY = y + this.config.fontSize * 0.8;
      ctx.font = `italic ${this.config.subtitleSize}px ${font}`;

      // Draw outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth * 0.8;
      ctx.strokeText(this.config.subtitle, x, subtitleY);

      // Draw fill
      ctx.fillStyle = color;
      ctx.fillText(this.config.subtitle, x, subtitleY);
    }

    ctx.restore();
  }

  isComplete(): boolean {
    return this.state === 'complete';
  }

  reset(): void {
    this.alpha = 0;
    this.state = 'waiting';
    this.stateTime = 0;
  }

  forceFadeOut(): void {
    if (this.state !== 'fading-out' && this.state !== 'complete') {
      this.state = 'fading-out';
      this.stateTime = 0;
    }
  }
}

// TitleCardGroup - manages multiple title cards as a single positioned group
export interface TitleCardGroupConfig {
  position: { x: number | string; y: number | string };
  textAlign?: 'left' | 'center' | 'right';
  fadeInStart: number;
  holdDuration: number;
  cards: Array<{
    text: string;
    fontSize: number;
    offsetY: number;
    letterSpacing?: number;
  }>;
}

export class TitleCardGroup {
  private titleCards: TitleCard[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    private config: TitleCardGroupConfig,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.createCards();
  }

  private createCards(): void {
    this.titleCards = this.config.cards.map(card => {
      const parsePosition = (value: string | number, dimension: number): number => {
        if (typeof value === 'number') return value;

        // Handle calc() expressions like "calc(25% - 50px)"
        if (typeof value === 'string' && value.startsWith('calc(')) {
          const expr = value.slice(5, -1); // Remove "calc(" and ")"
          const parts = expr.split(/([+-])/);
          let result = 0;
          let operator = '+';

          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed === '+' || trimmed === '-') {
              operator = trimmed;
            } else if (trimmed.endsWith('%')) {
              const percent = parseFloat(trimmed) / 100 * dimension;
              result = operator === '+' ? result + percent : result - percent;
            } else if (trimmed.endsWith('px')) {
              const pixels = parseFloat(trimmed);
              result = operator === '+' ? result + pixels : result - pixels;
            } else if (trimmed) {
              const num = parseFloat(trimmed);
              result = operator === '+' ? result + num : result - num;
            }
          }
          return result;
        }

        // Handle simple percentage
        if (typeof value === 'string' && value.endsWith('%')) {
          return (parseFloat(value) / 100) * dimension;
        }

        return parseFloat(value as string);
      };

      const baseX = parsePosition(this.config.position.x, this.canvasWidth);
      const baseY = parsePosition(this.config.position.y, this.canvasHeight);

      return new TitleCard(
        {
          text: card.text,
          fontSize: card.fontSize,
          position: { x: baseX, y: baseY + card.offsetY },
          fadeInStart: this.config.fadeInStart,
          holdDuration: this.config.holdDuration,
          textAlign: this.config.textAlign,
          letterSpacing: card.letterSpacing
        },
        this.canvasWidth,
        this.canvasHeight
      );
    });
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.createCards(); // Recreate cards with new dimensions
  }

  update(sceneTime: number, dt: number): void {
    this.titleCards.forEach(card => card.update(sceneTime, dt));
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.titleCards.forEach(card => card.render(ctx));
  }

  forceFadeOut(): void {
    this.titleCards.forEach(card => card.forceFadeOut());
  }

  reset(): void {
    this.titleCards.forEach(card => card.reset());
  }

  isComplete(): boolean {
    return this.titleCards.every(card => card.isComplete());
  }
}
