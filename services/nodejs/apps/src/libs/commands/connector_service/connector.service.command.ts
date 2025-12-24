import { HttpMethod } from '../../enums/http-methods.enum';
import { Logger } from '../../services/logger.service';
import { BaseCommand } from '../command.interface';

export interface ConnectorServiceResponse {
  statusCode: number;
  data?: any;
  msg?: string;
}

export interface ConnectorServiceCommandOptions {
  uri: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  body?: any;
}

const logger = Logger.getInstance({
  service: 'ConnectorServiceCommand',
});

export class ConnectorServiceCommand extends BaseCommand<ConnectorServiceResponse> {
  private method: HttpMethod;
  private body?: any;

  constructor(options: ConnectorServiceCommandOptions) {
    super(options.uri, options.queryParams, options.headers);
    this.method = options.method;
    this.body = this.sanitizeBody(options.body);
    this.headers = this.sanitizeHeaders(options.headers!);
  }

  public async execute(): Promise<ConnectorServiceResponse> {
    const url = this.buildUrl();
    const sanitizedHeaders = this.sanitizeHeaders(this.headers);
    const requestOptions: RequestInit = {
      method: this.method,
      headers: sanitizedHeaders,
      body: this.body,
    };

    try {
      const response = await this.fetchWithRetry(
        async () => fetch(url, requestOptions),
        3,
        300,
      );

      logger.info('Connector service command success', {
        url: url,
        statusCode: response.status,
        statusText: response.statusText,
      });

      const data = await response.json();

      logger.debug('Raw response from Connector service', {
        statusCode: response.status,
        data: data,
      });

      return {
        statusCode: response.status,
        data: data,
        msg: response.statusText,
      };
    } catch (error: any) {
      logger.error('Connector service command failed', {
        error: error.message,
        url: url,
        requestOptions: requestOptions,
      });
      throw error;
    }
  }
}

