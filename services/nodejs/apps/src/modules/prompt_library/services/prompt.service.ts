import mongoose, { FilterQuery } from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../libs/errors/http.errors';
import {
  PromptAccessLevel,
  PromptSharedWithEntry,
  PromptTemplate,
  PromptTemplateDocument,
  PromptVisibility,
} from '../schema/prompt.schema';

export interface PromptFilters {
  scope?: 'all' | 'private' | 'users' | 'workspace';
  category?: string;
  tag?: string;
  search?: string;
}

export interface PromptSortOptions {
  sortBy?: 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PromptPayload {
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  visibility?: PromptVisibility;
}

const normalizeTags = (tags?: string[]): string[] => {
  if (!tags) return [];
  const unique = new Set(
    tags
      .map((tag) => tag?.trim())
      .filter((tag): tag is string => Boolean(tag)),
  );
  return Array.from(unique).slice(0, 30);
};

export const buildPromptQuery = ({
  orgId,
  userId,
  filters,
}: {
  orgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  filters: PromptFilters;
}): FilterQuery<PromptTemplateDocument> => {
  const scope = filters.scope || 'all';
  const baseQuery: FilterQuery<PromptTemplateDocument> = {
    orgId,
    isDeleted: { $ne: true },
  };

  if (scope === 'private') {
    baseQuery.createdBy = userId;
    baseQuery.visibility = 'private';
  } else if (scope === 'users') {
    baseQuery.visibility = 'users';
    baseQuery['sharedWith.userId'] = userId;
  } else if (scope === 'workspace') {
    baseQuery.visibility = 'workspace';
  } else {
    baseQuery.$or = [
      { visibility: 'workspace' },
      { createdBy: userId },
      { visibility: 'users', 'sharedWith.userId': userId },
    ];
  }

  if (filters.category) {
    baseQuery.category = filters.category;
  }
  if (filters.tag) {
    baseQuery.tags = filters.tag;
  }
  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    baseQuery.$or = [
      ...(baseQuery.$or || []),
      { title: regex },
      { description: regex },
      { content: regex },
    ];
  }

  return baseQuery;
};

const buildSort = (options?: PromptSortOptions) => {
  const sort: Record<string, 1 | -1> = {};
  const field = options?.sortBy || 'updatedAt';
  const order = options?.sortOrder === 'asc' ? 1 : -1;
  sort[field] = order;
  if (field !== 'updatedAt') {
    sort.updatedAt = -1;
  }
  return sort;
};

const ensureOwnership = (
  prompt: PromptTemplateDocument | null,
  userId: mongoose.Types.ObjectId,
): PromptTemplateDocument => {
  if (!prompt) {
    throw new NotFoundError('Prompt not found');
  }
  if (String(prompt.createdBy) !== String(userId)) {
    throw new ForbiddenError('You do not have permission to modify this prompt');
  }
  return prompt;
};

const ensureOwnerOrSharedWriter = (
  prompt: PromptTemplateDocument | null,
  userId: mongoose.Types.ObjectId,
): PromptTemplateDocument => {
  if (!prompt) {
    throw new NotFoundError('Prompt not found');
  }
  if (String(prompt.createdBy) === String(userId)) {
    return prompt;
  }
  const hasWriteAccess = (prompt.sharedWith || []).some(
    (entry) =>
      String(entry.userId) === String(userId) && entry.accessLevel === 'write',
  );
  if (!hasWriteAccess) {
    throw new ForbiddenError('You do not have permission to modify this prompt');
  }
  return prompt;
};

export class PromptLibraryService {
  static async listPrompts(
    orgId: string,
    userId: string,
    filters: PromptFilters,
    sortOptions?: PromptSortOptions,
  ) {
    if (!mongoose.Types.ObjectId.isValid(orgId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError('Invalid organization or user id');
    }
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query = buildPromptQuery({
      orgId: orgObjectId,
      userId: userObjectId,
      filters,
    });

    return PromptTemplate.find(query)
      .sort(buildSort(sortOptions))
      .limit(200)
      .lean();
  }

  static async createPrompt(orgId: string, userId: string, payload: PromptPayload) {
    if (!mongoose.Types.ObjectId.isValid(orgId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError('Invalid organization or user id');
    }
    const prompt = new PromptTemplate({
      orgId: new mongoose.Types.ObjectId(orgId),
      createdBy: new mongoose.Types.ObjectId(userId),
      title: payload.title.trim(),
      description: payload.description?.trim(),
      content: payload.content.trim(),
      category: payload.category?.trim() || 'general',
      tags: normalizeTags(payload.tags),
      visibility: payload.visibility || 'private',
    });
    return prompt.save();
  }

  static async updatePrompt(
    orgId: string,
    userId: string,
    promptId: string,
    payload: PromptPayload,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    });

    const writablePrompt = ensureOwnerOrSharedWriter(
      prompt,
      new mongoose.Types.ObjectId(userId),
    );

    if (payload.title !== undefined) writablePrompt.title = payload.title.trim();
    if (payload.description !== undefined) writablePrompt.description = payload.description?.trim();
    if (payload.content !== undefined) writablePrompt.content = payload.content.trim();
    if (payload.category !== undefined) writablePrompt.category = payload.category?.trim();
    if (payload.tags !== undefined) writablePrompt.tags = normalizeTags(payload.tags);
    if (payload.visibility !== undefined) writablePrompt.visibility = payload.visibility;

    return writablePrompt.save();
  }

  static async deletePrompt(orgId: string, userId: string, promptId: string) {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    });
    const writablePrompt = ensureOwnership(
      prompt,
      new mongoose.Types.ObjectId(userId),
    );
    writablePrompt.isDeleted = true;
    return writablePrompt.save();
  }

  static async setVisibility(
    orgId: string,
    userId: string,
    promptId: string,
    visibility: PromptVisibility,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    });
    const writablePrompt = ensureOwnership(
      prompt,
      new mongoose.Types.ObjectId(userId),
    );
    writablePrompt.visibility = visibility;
    if (visibility !== 'users') {
      writablePrompt.sharedWith = [];
    }
    return writablePrompt.save();
  }

  static async shareWithUsers(
    orgId: string,
    userId: string,
    promptId: string,
    userIds: string[],
    accessLevel: PromptAccessLevel,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const validUserIds = userIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );
    if (!validUserIds.length) {
      throw new BadRequestError('At least one valid userId is required');
    }

    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    });
    const writablePrompt = ensureOwnership(
      prompt,
      new mongoose.Types.ObjectId(userId),
    );

    const sharedWith: PromptSharedWithEntry[] = writablePrompt.sharedWith || [];
    const existingById: Record<string, PromptSharedWithEntry> = {};
    sharedWith.forEach((entry) => {
      existingById[String(entry.userId)] = entry;
    });

    validUserIds.forEach((id) => {
      const key = String(id);
      const userObjectId = new mongoose.Types.ObjectId(id);
      if (existingById[key]) {
        existingById[key].accessLevel = accessLevel;
      } else {
        sharedWith.push({
          userId: userObjectId,
          accessLevel,
        });
      }
    });

    writablePrompt.sharedWith = sharedWith;
    writablePrompt.visibility = 'users';
    return writablePrompt.save();
  }

  static async getMembers(
    orgId: string,
    userId: string,
    promptId: string,
  ): Promise<{ sharedWith: PromptSharedWithEntry[]; ownerId: string }> {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    }).lean<PromptTemplateDocument | null>();
    if (!prompt) {
      throw new NotFoundError('Prompt not found');
    }
    if (String(prompt.createdBy) !== String(userId)) {
      throw new ForbiddenError('Only the owner can view members');
    }
    return {
      sharedWith: prompt.sharedWith || [],
      ownerId: String(prompt.createdBy),
    };
  }

  static async removeMember(
    orgId: string,
    userId: string,
    promptId: string,
    memberUserId: string,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(orgId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(promptId) ||
      !mongoose.Types.ObjectId.isValid(memberUserId)
    ) {
      throw new BadRequestError('Invalid identifier');
    }
    const prompt = await PromptTemplate.findOne({
      _id: new mongoose.Types.ObjectId(promptId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    });
    const writablePrompt = ensureOwnership(
      prompt,
      new mongoose.Types.ObjectId(userId),
    );
    const memberObjectId = new mongoose.Types.ObjectId(memberUserId);
    writablePrompt.sharedWith =
      (writablePrompt.sharedWith || []).filter(
        (entry) => String(entry.userId) !== String(memberObjectId),
      );
    return writablePrompt.save();
  }
}


