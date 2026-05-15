import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlertType, AlertSeverity } from '@ledn/shared';
import { AlertRecord, AlertDocument } from './alert.schema';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectModel(AlertRecord.name)
    private readonly alertModel: Model<AlertDocument>,
  ) {}

  async create(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    assetId?: string,
  ): Promise<AlertRecord> {
    this.logger.warn(`[${severity}] ${type} — ${message}`);
    return this.alertModel.create({ type, severity, message, assetId });
  }

  async resolve(id: string): Promise<void> {
    await this.alertModel.findByIdAndUpdate(id, {
      resolved: true,
      resolvedAt: new Date(),
    });
  }

  async findActive(): Promise<AlertRecord[]> {
    return this.alertModel
      .find({ resolved: false })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async findAll(): Promise<AlertRecord[]> {
    return this.alertModel.find().sort({ createdAt: -1 }).limit(100);
  }
}
