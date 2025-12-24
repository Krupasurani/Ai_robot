import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Container } from 'inversify';
import { ValidationMiddleware } from '../../../libs/middlewares/validation.middleware';
import { AuthMiddleware } from '../../../libs/middlewares/auth.middleware';
import { userAdminCheck } from '../middlewares/userAdminCheck';
import { TeamsController } from '../controller/team.controller';
import { AuthenticatedUserRequest } from '../../../libs/middlewares/types';
import { metricsMiddleware } from '../../../libs/middlewares/prometheus.middleware';

const TeamIdUrlParams = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

const TeamIdValidationSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: TeamIdUrlParams,
  headers: z.object({}),
});

const createTeamValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Team name is required'),
    description: z.string().optional(),
  }),
  query: z.object({}),
  params: z.object({}),
  headers: z.object({}),
});

const updateTeamValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }),
  query: z.object({}),
  params: TeamIdUrlParams,
  headers: z.object({}),
});

export function createTeamsRouter(container: Container): Router {
  const router = Router();

  const authMiddleware = container.get<AuthMiddleware>('AuthMiddleware');
  const teamsController = container.get<TeamsController>('TeamsController');

  // POST /api/v1/teams - Create a new team
  router.post(
    '/',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(createTeamValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.createTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/v1/teams - List all teams
  router.get(
    '/',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.listTeams(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/v1/teams/:teamId - Get a specific team
  router.get(
    '/:teamId',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.getTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // PUT /api/v1/teams/:teamId - Update a team
  router.put(
    '/:teamId',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(updateTeamValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.updateTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // DELETE /api/v1/teams/:teamId - Delete a team
  router.delete(
    '/:teamId',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.deleteTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /api/v1/teams/:teamId/users - Add users to team
  router.post(
    '/:teamId/users',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.addUsersToTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // DELETE /api/v1/teams/:teamId/users - Remove users from team
  router.delete(
    '/:teamId/users',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.removeUserFromTeam(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/v1/teams/:teamId/users - Get team users
  router.get(
    '/:teamId/users',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.getTeamUsers(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // PUT /api/v1/teams/:teamId/users/permissions - Update team users permissions
  router.put(
    '/:teamId/users/permissions',
    authMiddleware.authenticate,
    ValidationMiddleware.validate(TeamIdValidationSchema),
    userAdminCheck,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.updateTeamUsersPermissions(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  // GET /api/v1/teams/user/teams - Get teams for current user
  router.get(
    '/user/teams',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    async (req: AuthenticatedUserRequest, res: Response, next: NextFunction) => {
      try {
        await teamsController.getUserTeams(req, res, next);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

