import { NextFunction, Response } from 'express';
import { AuthenticatedUserRequest } from '../../../libs/middlewares/types';
import { Logger } from '../../../libs/services/logger.service';
import { HTTP_STATUS } from '../../../libs/enums/http-status.enum';
import { PromptLibraryService } from '../services/prompt.service';
import { PromptAccessLevel, PromptVisibility } from '../schema/prompt.schema';
import { loadAppConfig } from '../../tokens_manager/config/config';
import { AIServiceCommand } from '../../../libs/commands/ai_service/ai.service.command';
import { HttpMethod } from '../../../libs/enums/http-methods.enum';
import { AIServiceResponse, IAIResponse } from '../../enterprise_search/types/conversation.interfaces';
import { BadRequestError, ServiceUnavailableError } from '../../../libs/errors/http.errors';

const logger = Logger.getInstance({
  service: 'PromptLibraryController',
});

const ensureUserContext = (req: AuthenticatedUserRequest) => {
  const orgId = req.user?.orgId;
  const userId = req.user?.userId;
  if (!orgId || !userId) {
    throw new BadRequestError('Missing organization or user context');
  }
  return { orgId: String(orgId), userId: String(userId) };
};

export const listPrompts = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const prompts = await PromptLibraryService.listPrompts(
      orgId,
      userId,
      {
        scope: (req.query.visibility as 'all' | 'private' | 'workspace') || 'all',
        category: req.query.category as string | undefined,
        tag: req.query.tag as string | undefined,
        search: req.query.search as string | undefined,
      },
      {
        sortBy: (req.query.sortBy as 'updatedAt' | 'title') || 'updatedAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      },
    );
    res.status(HTTP_STATUS.OK).json({ prompts });
  } catch (error) {
    next(error);
  }
};

export const createPrompt = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const prompt = await PromptLibraryService.createPrompt(orgId, userId, req.body);
    res.status(HTTP_STATUS.CREATED).json({ prompt });
  } catch (error) {
    next(error);
  }
};

export const updatePrompt = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    const prompt = await PromptLibraryService.updatePrompt(
      orgId,
      userId,
      promptId,
      req.body,
    );
    res.status(HTTP_STATUS.OK).json({ prompt });
  } catch (error) {
    next(error);
  }
};

export const deletePrompt = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    await PromptLibraryService.deletePrompt(orgId, userId, promptId);
    res.status(HTTP_STATUS.OK).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const sharePrompt = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    const { visibility } = req.body as { visibility: PromptVisibility };
    const prompt = await PromptLibraryService.setVisibility(
      orgId,
      userId,
      promptId,
      visibility,
    );
    res.status(HTTP_STATUS.OK).json({ prompt });
  } catch (error) {
    next(error);
  }
};

export const sharePromptWithUsers = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    const { userIds, accessLevel } = req.body as {
      userIds: string[];
      accessLevel: PromptAccessLevel;
    };
    const prompt = await PromptLibraryService.shareWithUsers(
      orgId,
      userId,
      promptId,
      userIds,
      accessLevel,
    );
    res.status(HTTP_STATUS.OK).json({ prompt });
  } catch (error) {
    next(error);
  }
};

export const getPromptMembers = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    const result = await PromptLibraryService.getMembers(orgId, userId, promptId);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const unsharePromptUsers = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orgId, userId } = ensureUserContext(req);
    const promptId = req.params.promptId;
    if (!promptId) {
      throw new BadRequestError('Prompt ID is required');
    }
    const { userIds } = req.body as { userIds: string[] };
    await Promise.all(
      userIds.map((memberUserId) =>
        PromptLibraryService.removeMember(orgId, userId, promptId, memberUserId),
      ),
    );
    res.status(HTTP_STATUS.OK).json({ success: true });
  } catch (error) {
    next(error);
  }
};

interface AssistantRequestBody {
  idea?: string;
  goal?: string;
  tone?: string;
  audience?: string;
  constraints?: string;
  tags?: string[];
  category?: string;
  existingPrompt?: string;
  modelKey?: string | null;
  modelName?: string | null;
}

const buildAssistantQuery = (body: AssistantRequestBody) => {
  const lines = [
    'You are an expert prompt engineer. Create a reusable prompt template.',
    'Return STRICT JSON with keys: title (string), description (string), prompt (string), guidelines (string array). Do not include markdown fences.',
    'Inputs:',
    `Idea: ${body.idea || 'N/A'}`,
    `Goal: ${body.goal || 'N/A'}`,
    `Tone: ${body.tone || 'balanced'}`,
    `Audience: ${body.audience || 'general knowledge workers'}`,
    `Constraints: ${body.constraints || 'none'}`,
    `ExistingPrompt: ${body.existingPrompt || 'N/A'}`,
  ];
  return lines.join('\n');
};

const tryParseSuggestion = (answer?: string) => {
  if (!answer) return null;
  const stripped = answer
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    if (parsed?.prompt) {
      return {
        title: parsed.title || 'AI Prompt',
        description: parsed.description || '',
        content: parsed.prompt,
        guidelines: Array.isArray(parsed.guidelines) ? parsed.guidelines : [],
      };
    }
  } catch (error) {
    logger.warn('Failed to parse assistant response as JSON', {
      message: (error as Error).message,
    });
  }
  return null;
};

const buildFallbackSuggestion = (body: AssistantRequestBody) => {
  const title =
    body.idea?.slice(0, 80) ||
    body.goal?.slice(0, 80) ||
    'Prompt Template';
  const description =
    body.goal ||
    'Reusable prompt template generated from quick assistant fallback.';
  const segments = [
    `You are an AI assistant helping with ${body.goal || 'the stated objective'}.`,
    `Adopt a ${body.tone || 'professional'} tone for ${body.audience || 'knowledge workers'}.`,
    body.constraints
      ? `Constraints: ${body.constraints}.`
      : 'Follow best practices and cite assumptions.',
    'Respond with structured, concise, and actionable guidance.',
  ];
  return {
    title,
    description,
    content: segments.join('\n\n'),
    guidelines: [
      'Clarify ambiguities before answering.',
      'List assumptions and decision points.',
      'Provide next steps or recommendations when possible.',
    ],
  };
};

export const assistPrompt = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body as AssistantRequestBody;
    if (
      !body.idea &&
      !body.goal &&
      !body.existingPrompt
    ) {
      throw new BadRequestError(
        'Provide at least an idea, goal, or existingPrompt to generate suggestions',
      );
    }

    let suggestion = buildFallbackSuggestion(body);
    try {
      const appConfig = await loadAppConfig();
      const aiCommand = new AIServiceCommand<IAIResponse>({
        uri: `${appConfig.aiBackend}/api/v1/chat`,
        method: HttpMethod.POST,
        headers: req.headers as Record<string, string>,
        body: {
          query: buildAssistantQuery(body),
          previousConversations: [],
          recordIds: [],
          filters: {},
          modelKey: body.modelKey || null,
          modelName: body.modelName || null,
          chatMode: 'prompt-designer',
        },
      });
      const aiResponse = (await aiCommand.execute()) as AIServiceResponse<IAIResponse>;
      if (aiResponse?.statusCode === 200 && aiResponse?.data?.answer) {
        const parsed = tryParseSuggestion(aiResponse.data.answer);
        if (parsed?.content) {
          suggestion = {
            title: parsed.title,
            description: parsed.description,
            content: parsed.content,
            guidelines: parsed.guidelines,
          };
        }
      } else {
        throw new ServiceUnavailableError(
          aiResponse?.msg || 'Assistant service unavailable',
        );
      }
    } catch (error) {
      logger.warn('Assistant prompt fallback triggered', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    res.status(HTTP_STATUS.OK).json({ suggestion });
  } catch (error) {
    next(error);
  }
};


