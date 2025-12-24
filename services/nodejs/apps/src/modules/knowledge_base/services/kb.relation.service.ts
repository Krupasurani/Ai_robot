import { ArangoService } from '../../../libs/services/arango.service';
import { Logger } from '../../../libs/services/logger.service';
import { COLLECTIONS } from '../constants/record.constants';
import { IRecordDocument } from '../types/record';
import { IFileRecordDocument } from '../types/file_record';
import {
  RecordsEventProducer,
  NewRecordEvent,
} from './records_events.service';
import {
  SyncEventProducer,
  Event as SyncEvent,
  ReindexAllRecordEvent,
} from './sync_events.service';
import { DefaultStorageConfig } from '../../tokens_manager/services/cm.service';
import { KeyValueStoreService } from '../../../libs/services/keyValueStore.service';
import {
  InternalServerError,
  BadRequestError,
} from '../../../libs/errors/http.errors';

export interface ReindexAllRecordsPayload {
  orgId: string;
  userId: string;
  app: string;
}

export interface ResyncConnectorRecordsPayload {
  orgId: string;
  userId: string;
  connectorName: string;
}

export interface SyncCommandResponse {
  status: 'queued';
  connector: string;
  eventTimestamp: number;
}

export class RecordRelationService {
  private readonly logger = Logger.getInstance({
    service: 'RecordRelationService',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly recordsCollection: any;
  public readonly eventProducer: RecordsEventProducer;

  constructor(
    private readonly arangoService: ArangoService,
    recordsEventProducer: RecordsEventProducer,
    private readonly syncEventProducer: SyncEventProducer,
    private readonly storageConfig: DefaultStorageConfig,
  ) {
    const db = this.arangoService.getConnection();
    this.recordsCollection = db.collection(COLLECTIONS.RECORDS);
    this.eventProducer = recordsEventProducer;
  }

  async checkRecordExists(recordKey: string): Promise<boolean> {
    try {
      return await this.recordsCollection.documentExists(recordKey);
    } catch (error: any) {
      this.logger.error('Failed to check record existence', {
        recordKey,
        error: error?.message || error,
      });
      throw new InternalServerError('Failed to check record existence');
    }
  }

  async createNewRecordEventPayload(
    record: IRecordDocument,
    _keyValueStoreService: KeyValueStoreService,
    fileRecord: IFileRecordDocument,
  ): Promise<NewRecordEvent> {
    if (!record.externalRecordId) {
      throw new BadRequestError(
        'Record missing external document identifier required for events',
      );
    }

    const extension =
      fileRecord.extension || this.extractExtension(record.recordName);
    const mimeType =
      fileRecord.mimeType ||
      record.mimeType ||
      'application/octet-stream';

    return {
      orgId: record.orgId,
      recordId: record._key,
      recordName: record.recordName,
      recordType: record.recordType,
      version: record.version ?? 1,
      signedUrlRoute: this.buildSignedUrlRoute(record.externalRecordId),
      origin: record.origin,
      extension: extension || '',
      mimeType,
      createdAtTimestamp: this.formatTimestamp(record.createdAtTimestamp),
      updatedAtTimestamp: this.formatTimestamp(
        record.updatedAtTimestamp ?? record.createdAtTimestamp,
      ),
      sourceCreatedAtTimestamp: this.formatTimestamp(
        record.sourceCreatedAtTimestamp ?? record.createdAtTimestamp,
      ),
    };
  }

  async reindexAllRecords(
    payload: ReindexAllRecordsPayload,
  ): Promise<SyncCommandResponse> {
    try {
      const connectorNormalized = payload.app
        .replace(/\s+/g, '')
        .toLowerCase();
      
      const eventType = `${connectorNormalized}.reindex`;
      
      const eventPayload = {
        orgId: payload.orgId,
        statusFilters: ['FAILED'],
      };

      const event: SyncEvent = {
        eventType: eventType,
        timestamp: Date.now(),
        payload: eventPayload,
      };

      await this.emitSyncEvent(event);
      this.logger.info(`Published ${eventType} event for app ${payload.app}`);
      return {
        status: 'queued',
        connector: payload.app,
        eventTimestamp: event.timestamp,
      };
    } catch (eventError: any) {
      this.logger.error('Failed to publish reindex record event', {
        error: eventError,
      });
      // Don't throw the error to avoid affecting the main operation
      return {
        status: 'queued',
        connector: payload.app,
        eventTimestamp: Date.now(),
      };
    }
  }

  async resyncConnectorRecords(
    payload: ResyncConnectorRecordsPayload,
  ): Promise<SyncCommandResponse> {
    const eventPayload = this.buildSyncPayload(
      payload.orgId,
      payload.connectorName,
    );
    const event: SyncEvent = {
      eventType: 'resyncConnectorRecords',
      timestamp: Date.now(),
      payload: eventPayload,
    };

    await this.emitSyncEvent(event);
    return {
      status: 'queued',
      connector: payload.connectorName,
      eventTimestamp: event.timestamp,
    };
  }

  private async emitSyncEvent(event: SyncEvent): Promise<void> {
    try {
      await this.syncEventProducer.start();
      await this.syncEventProducer.publishEvent(event);
    } catch (error: any) {
      this.logger.error('Failed to publish sync event', {
        eventType: event.eventType,
        error: error?.message || error,
      });
      throw new InternalServerError(
        `Failed to publish ${event.eventType} event`,
      );
    }
  }

  private buildSyncPayload(
    orgId: string,
    connector: string,
  ): ReindexAllRecordEvent {
    const timestamp = new Date().toISOString();
    return {
      orgId,
      connector,
      origin: connector,
      createdAtTimestamp: timestamp,
      updatedAtTimestamp: timestamp,
      sourceCreatedAtTimestamp: timestamp,
    };
  }

  private formatTimestamp(value?: number): string {
    const date = value ? new Date(value) : new Date();
    return date.toISOString();
  }

  private extractExtension(name?: string | null): string | undefined {
    if (!name || !name.includes('.')) {
      return undefined;
    }
    const parts = name.split('.');
    const extension = parts[parts.length - 1];
    return extension?.toLowerCase();
  }

  private buildSignedUrlRoute(externalRecordId: string): string {
    const base = this.storageConfig?.endpoint?.replace(/\/$/, '') || '';
    return `${base}/api/v1/document/${externalRecordId}`;
  }
}

