import { Injectable, Logger } from '@nestjs/common';
import { LiquiditySnapshot } from '@ledn/shared';

@Injectable()
export class LiquidityService {
  private readonly logger = new Logger(LiquidityService.name);

  private snapshot: LiquiditySnapshot = {
    available: 1_250_000,
    locked: 320_000,
    inFlight: 85_000,
    total: 1_655_000,
    updatedAt: new Date().toISOString(),
  };

  getSnapshot(): LiquiditySnapshot {
    const available: number = this.fluctuate(
      this.snapshot.available as number,
      0.02,
    );
    const inFlight: number = this.fluctuate(
      this.snapshot.inFlight as number,
      0.05,
    );

    this.snapshot = {
      ...this.snapshot,
      available,
      inFlight,
      updatedAt: new Date().toISOString(),
    };

    this.snapshot.total =
      this.snapshot.available + this.snapshot.locked + this.snapshot.inFlight;

    return this.snapshot;
  }

  lockFunds(amount: number): void {
    if (amount > this.snapshot.available) {
      throw new Error('Insufficient available funds');
    }
    this.snapshot.available -= amount;
    this.snapshot.locked += amount;
    this.snapshot.updatedAt = new Date().toISOString();
    this.logger.log(`Locked ${amount} — available: ${this.snapshot.available}`);
  }

  releaseFunds(amount: number): void {
    this.snapshot.locked -= amount;
    this.snapshot.available += amount;
    this.snapshot.updatedAt = new Date().toISOString();
    this.logger.log(
      `Released ${amount} — available: ${this.snapshot.available}`,
    );
  }
  private fluctuate(value: number, factor: number): number {
    const delta = value * factor * (Math.random() - 0.5);
    return parseFloat((value + delta).toFixed(2));
  }
}
