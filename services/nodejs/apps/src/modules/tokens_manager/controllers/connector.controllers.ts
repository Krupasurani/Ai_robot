import { NextFunction, Response } from 'express';
import { Logger } from '../../../libs/services/logger.service';
import { AppConfig } from '../config/config';
import { HttpMethod } from '../../../libs/enums/http-methods.enum';
import { executeConnectorCommand, handleBackendError, handleConnectorResponse } from '../utils/connector.utils';
import { AuthenticatedUserRequest } from '../../../libs/middlewares/types';

const logger = Logger.getInstance({
  service: 'Connector Controller',
});

export const getConnectors =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get all connectors',
        'Connectors not found',
      );
    } catch (error: any) {
      logger.error('Error getting all connectors', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get all connectors');
      next(handleError);
    }
  };

export const getConnectorByName =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get connector by name',
        'Connector by name not found',
      );
    } catch (error: any) {
      logger.error('Error getting connector by name', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get connector by name');
      next(handleError);
    }
  };

export const getActiveConnectors =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/active`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get all active connectors',
        'Active connectors not found',
      );
    } catch (error: any) {
      logger.error('Error getting all active connectors', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get all active connectors');
      next(handleError);
    }
  };

export const getInactiveConnectors =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/inactive`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get all inactive connectors',
        'Inactive connectors not found',
      );
    } catch (error: any) {
      logger.error('Error getting all inactive connectors', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get all inactive connectors');
      next(handleError);
    }
  };

export const getConnectorConfig =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/config/${connectorName}`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get connector config',
        'Connector config not found',
      );
    } catch (error: any) {
      logger.error('Error getting connector config', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get connector config');
      next(handleError);
    }
  };

export const updateConnectorConfig =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/config/${connectorName}`,
        HttpMethod.PUT,
        req.headers as Record<string, string>,
        req.body,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'update connector config',
        'Connector config not found',
      );
    } catch (error: any) {
      logger.error('Error updating connector config', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'update connector config');
      next(handleError);
    }
  };

export const getConnectorSchema =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/schema/${connectorName}`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get connector schema',
        'Connector schema not found',
      );
    } catch (error: any) {
      logger.error('Error getting connector schema', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get connector schema');
      next(handleError);
    }
  };

export const getConnectorConfigAndSchema =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/config-schema/${connectorName}`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get connector config and schema',
        'Connector config and schema not found',
      );
    } catch (error: any) {
      logger.error('Error getting connector config and schema', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get connector config and schema');
      next(handleError);
    }
  };

export const toggleConnector =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/toggle/${connectorName}`,
        HttpMethod.POST,
        req.headers as Record<string, string>,
        req.body,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'toggle connector',
        'Connector not found',
      );
    } catch (error: any) {
      logger.error('Error toggling connector', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'toggle connector');
      next(handleError);
    }
  };

export const getOAuthAuthorizationUrl =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}/oauth/authorize`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get OAuth authorization url',
        'OAuth authorization url not found',
      );
    } catch (error: any) {
      logger.error('Error getting OAuth authorization url', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get OAuth authorization url');
      next(handleError);
    }
  };

export const getConnectorFilterOptions =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}/filters`,
        HttpMethod.GET,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'get connector filter options',
        'Connector filter options not found',
      );
    } catch (error: any) {
      logger.error('Error getting connector filter options', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'get connector filter options');
      next(handleError);
    }
  };

export const saveConnectorFilterOptions =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}/filters`,
        HttpMethod.POST,
        req.headers as Record<string, string>,
        req.body,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'save connector filter options',
        'Connector filter options not found',
      );
    } catch (error: any) {
      logger.error('Error saving connector filter options', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'save connector filter options');
      next(handleError);
    }
  };

export const handleOAuthCallback =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}/oauth/callback`,
        HttpMethod.POST,
        req.headers as Record<string, string>,
        { ...req.query, ...req.body },
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'handle OAuth callback',
        'OAuth callback failed',
      );
    } catch (error: any) {
      logger.error('Error handling OAuth callback', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'handle OAuth callback');
      next(handleError);
    }
  };

export const deleteConnector =
  (appConfig: AppConfig) =>
  async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
    try {
      const { connectorName } = req.params;

      const connectorResponse = await executeConnectorCommand(
        `${appConfig.connectorBackend}/api/v1/connectors/${connectorName}`,
        HttpMethod.DELETE,
        req.headers as Record<string, string>,
      );

      handleConnectorResponse(
        connectorResponse,
        res,
        'delete connector',
        'Connector deletion failed',
      );
    } catch (error: any) {
      logger.error('Error deleting connector', {
        error: error.message,
      });
      const handleError = handleBackendError(error, 'delete connector');
      next(handleError);
    }
  };
