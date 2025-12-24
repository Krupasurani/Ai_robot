import { Router } from 'express';
import { Container } from 'inversify';
import { AuthMiddleware } from '../../../libs/middlewares/auth.middleware';
import { ValidationMiddleware } from '../../../libs/middlewares/validation.middleware';
import { metricsMiddleware } from '../../../libs/middlewares/prometheus.middleware';
import {
  assistPrompt,
  createPrompt,
  deletePrompt,
  listPrompts,
  sharePrompt,
  sharePromptWithUsers,
  getPromptMembers,
  unsharePromptUsers,
  updatePrompt,
} from '../controller/prompt.controller';
import {
  assistantPromptSchema,
  createPromptSchema,
  deletePromptSchema,
  listPromptsSchema,
  sharePromptSchema,
  sharePromptWithUsersSchema,
  unsharePromptUsersSchema,
  updatePromptSchema,
} from '../validators/prompt.validators';

export const createPromptLibraryRouter = (container: Container): Router => {
  const router = Router();
  const authMiddleware = container.get<AuthMiddleware>('AuthMiddleware');

  router.get(
    '/',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(listPromptsSchema),
    listPrompts,
  );

  router.post(
    '/',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(createPromptSchema),
    createPrompt,
  );

  router.put(
    '/:promptId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(updatePromptSchema),
    updatePrompt,
  );

  router.delete(
    '/:promptId',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(deletePromptSchema),
    deletePrompt,
  );

  router.post(
    '/:promptId/share',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(sharePromptSchema),
    sharePrompt,
  );

  router.post(
    '/:promptId/share-users',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(sharePromptWithUsersSchema),
    sharePromptWithUsers,
  );

  router.get(
    '/:promptId/members',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    getPromptMembers,
  );

  router.post(
    '/:promptId/unshare-users',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(unsharePromptUsersSchema),
    unsharePromptUsers,
  );

  router.post(
    '/assistant',
    authMiddleware.authenticate,
    metricsMiddleware(container),
    ValidationMiddleware.validate(assistantPromptSchema),
    assistPrompt,
  );

  return router;
};


