import { Router } from 'express';
import { Container } from 'inversify';
import { AuthMiddleware } from '../../../libs/middlewares/auth.middleware';
import { ValidationMiddleware } from '../../../libs/middlewares/validation.middleware';
import { metricsMiddleware } from '../../../libs/middlewares/prometheus.middleware';
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject,
  listProjectMembers,
  shareProject,
  unshareProject,
  listProjectMemories,
  createProjectMemory,
  updateProjectMemory,
  deleteProjectMemory,
} from '../controller/project.controller';
import {
  createProjectSchema,
  projectIdParamsSchema,
  updateProjectSchema,
  shareProjectParamsSchema,
  unshareProjectParamsSchema,
  projectMemoriesParamsSchema,
  createMemorySchema,
  updateMemorySchema,
} from '../validators/project.validators';

export function createProjectsRouter(container: Container): Router {
  const router = Router();
  const authMiddleware = container.get<AuthMiddleware>('AuthMiddleware');

  router.post(
    '/',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(createProjectSchema),
    createProject,
  );

  router.get(
    '/',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    listProjects,
  );

  router.get(
    '/:projectId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(projectIdParamsSchema),
    getProjectById,
  );

  router.patch(
    '/:projectId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(updateProjectSchema),
    updateProject,
  );

  router.get(
    '/:projectId/members',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(projectIdParamsSchema),
    listProjectMembers,
  );

  router.post(
    '/:projectId/share',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(shareProjectParamsSchema),
    shareProject,
  );

  router.post(
    '/:projectId/unshare',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(unshareProjectParamsSchema),
    unshareProject,
  );

  router.delete(
    '/:projectId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(projectIdParamsSchema),
    deleteProject,
  );

  // Memories CRUD
  router.get(
    '/:projectId/memories',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(projectIdParamsSchema),
    listProjectMemories,
  );

  router.post(
    '/:projectId/memories',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(createMemorySchema),
    createProjectMemory,
  );

  router.patch(
    '/:projectId/memories/:memoryId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(updateMemorySchema),
    updateProjectMemory,
  );

  router.delete(
    '/:projectId/memories/:memoryId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(projectMemoriesParamsSchema),
    deleteProjectMemory,
  );

  return router;
}


