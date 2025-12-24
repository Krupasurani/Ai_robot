import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'inversify';
import { AuthMiddleware } from '../../../libs/middlewares/auth.middleware';
import { metricsMiddleware } from '../../../libs/middlewares/prometheus.middleware';
import { AuthenticatedUserRequest } from '../../../libs/middlewares/types';
import { AppConfig } from '../../tokens_manager/config/config';
import {
  LicenseHttpService,
  UpdateSubscriptionPayload,
} from '../services/license.service';
import { BadRequestError } from '../../../libs/errors/http.errors';

export function createLicenseRouter(container: Container): Router {
  const router = Router();
  const config = container.get<AppConfig>('AppConfig');

  const dynamicAuth = () =>
    (req: Request, res: Response, next: NextFunction) =>
      container
        .get<AuthMiddleware>('AuthMiddleware')
        .authenticate(req as any, res, next);

  const licenseService = new LicenseHttpService(config);
  const getAuthHeader = (req: Request): string | undefined =>
    (req.headers.authorization as string | undefined);

  const getOrgId = (req: AuthenticatedUserRequest): string => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      throw new BadRequestError('Missing orgId in user token');
    }
    return orgId;
  };

  // License overview for admin UI
  router.get(
    '/overview',
    dynamicAuth(),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        const orgId = getOrgId(req);
        const overview = await licenseService.getOverview(orgId, {
          authToken: getAuthHeader(req),
        });
        res.json(overview);
      } catch (error) {
        next(error);
      }
    },
  );

  // Update subscription (seats/plan)
  router.post(
    '/subscription/update',
    dynamicAuth(),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        const orgId = getOrgId(req);
        const body = req.body as Partial<UpdateSubscriptionPayload>;

        if (typeof body.seatsTotal !== 'number') {
          throw new BadRequestError('seatsTotal is required');
        }

        const updated = await licenseService.updateSubscription(
          orgId,
          {
            seatsTotal: body.seatsTotal,
            priceId: body.priceId,
          },
          { authToken: getAuthHeader(req) },
        );

        res.json(updated);
      } catch (error) {
        next(error);
      }
    },
  );

  // Ensure seat for a user (used by invite/SSO flows)
  router.post(
    '/ensure-seat',
    dynamicAuth(),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        const orgId = getOrgId(req);
        const { userId, userEmail } = req.body as {
          userId: string;
          userEmail: string;
        };

        if (!userId || !userEmail) {
          throw new BadRequestError('userId and userEmail are required');
        }

        await licenseService.ensureSeat(orgId, userId, userEmail, {
          authToken: getAuthHeader(req),
        });
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  // Release seat for a user (used when deactivating users)
  router.post(
    '/release-seat',
    dynamicAuth(),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        const orgId = getOrgId(req);
        const { userId } = req.body as { userId: string };

        if (!userId) {
          throw new BadRequestError('userId is required');
        }

        await licenseService.releaseSeat(orgId, userId, {
          authToken: getAuthHeader(req),
        });
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  // Invoices list for admin UI
  router.get(
    '/invoices',
    dynamicAuth(),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        const orgId = getOrgId(req);
        const invoices = await licenseService.getInvoices(orgId, {
          authToken: getAuthHeader(req),
        });
        res.json(invoices);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}


