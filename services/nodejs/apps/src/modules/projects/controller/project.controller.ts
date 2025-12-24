import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedUserRequest } from '../../../libs/middlewares/types';
import { Logger } from '../../../libs/services/logger.service';
import { Project } from '../schema/project.schema';
import { IAMServiceCommand } from '../../../libs/commands/iam/iam.service.command';
import { HttpMethod } from '../../../libs/enums/http-methods.enum';
import axios from 'axios';
import { loadAppConfig, AppConfig } from '../../tokens_manager/config/config';
import { HTTP_STATUS } from '../../../libs/enums/http-status.enum';

const logger = Logger.getInstance({ service: 'Projects Controller' });

export const createProject = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const payload = {
      orgId: new mongoose.Types.ObjectId(orgId),
      createdBy: new mongoose.Types.ObjectId(userId),
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      goal: req.body.goal,
      systemPrompt: req.body.systemPrompt,
      template: req.body.template,
    };
    const project = new Project(payload);
    const saved = await project.save();

    // Fire-and-forget KB creation. We do not block project creation response.
    (async () => {
      try {
        const appConfig: AppConfig = await loadAppConfig();
        const kbName = `[Project] ${payload.title}`;
        const response = await axios.post(`${appConfig.connectorBackend}/api/v1/kb/`, {
          userId: String(userId),
          orgId: String(orgId),
          name: kbName,
          isGlobal: false,
        });

        if (response?.status === 200 && response?.data?.id) {
          const kbId: string = response.data.id;
          await Project.findByIdAndUpdate(
            (saved as any)._id,
            { $set: { kbId } },
            { new: false },
          );
          logger.info(`Associated KB ${kbId} with project ${(saved as any)._id}`);

          // Best-effort: ensure owner has OWNER role on the project KB
          try {
            await axios.post(
              `${appConfig.connectorBackend}/api/v1/kb/${kbId}/permissions`,
              {
                requesterId: String(userId),
                users: [String(userId)],
                role: 'OWNER',
              },
            );
            logger.info(`Granted OWNER role on KB ${kbId} to user ${userId}`);
          } catch (permErr: any) {
            logger.warn('Failed to set OWNER role on KB after creation', {
              error: permErr?.message,
              kbId,
              projectId: (saved as any)._id,
            });
          }
        } else {
          logger.warn('KB creation response unexpected', {
            status: response?.status,
            data: response?.data,
          });
        }
      } catch (kbError: any) {
        logger.error('Background KB creation failed', {
          error: kbError?.message,
          response: kbError?.response?.data,
          status: kbError?.response?.status,
        });
      }
    })();

    res.status(HTTP_STATUS.CREATED).json(saved);
  } catch (error) {
    logger.error('Error creating project', error);
    next(error);
  }
};

export const listProjects = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const scope = String((req.query?.scope as string) || 'all');
    const baseQuery: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
    };
    if (scope === 'mine') {
      baseQuery.createdBy = new mongoose.Types.ObjectId(userId);
    } else if (scope === 'shared') {
      baseQuery['sharedWith.userId'] = new mongoose.Types.ObjectId(userId);
    } else {
      baseQuery.$or = [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId) },
      ];
    }
    const projects = await Project.find(baseQuery)
      .sort({ updatedAt: -1 })
      .lean();
    res.json(projects);
  } catch (error) {
    logger.error('Error listing projects', error);
    next(error);
  }
};

export const getProjectById = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId) },
      ],
    }).lean();

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    logger.error('Error getting project', error);
    next(error);
  }
};

export const updateProject = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const update: Record<string, any> = {};
    const fields = ['title', 'description', 'tags', 'goal', 'systemPrompt', 'template', 'isDeleted'];
    for (const key of fields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const updated = await Project.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        orgId: new mongoose.Types.ObjectId(orgId),
        createdBy: new mongoose.Types.ObjectId(userId),
      },
      { $set: update },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }
    res.json(updated);
  } catch (error) {
    logger.error('Error updating project', error);
    next(error);
  }
};

export const deleteProject = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;

    const updated = await Project.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        orgId: new mongoose.Types.ObjectId(orgId),
        createdBy: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isDeleted: true } },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting project', error);
    next(error);
  }
};


export const listProjectMembers = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      createdBy: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    })
      .select('sharedWith createdBy')
      .lean();

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    res.json({
      ownerId: project.createdBy,
      sharedWith: project.sharedWith || [],
    });
  } catch (error) {
    logger.error('Error listing project members', error);
    next(error);
  }
};

export const shareProject = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const { userIds, accessLevel } = req.body as { userIds: string[]; accessLevel?: 'read' | 'write' };

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId), 'sharedWith.accessLevel': 'write' },
      ],
      isDeleted: { $ne: true },
    });

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    // Validate all users in IAM and ensure they belong to org
    const appConfig = await loadAppConfig();
    const validatedUsers = await Promise.all(
      userIds.map(async (id: string) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid user ID: ${id}`);
        }
        const iamCommand = new IAMServiceCommand({
          uri: `${appConfig.iamBackend}/api/v1/users/${id}`,
          method: HttpMethod.GET,
          headers: req.headers as Record<string, string>,
        });
        const iamResponse = await iamCommand.execute();
        if (!iamResponse || iamResponse.statusCode !== 200 || !iamResponse.data) {
          throw new Error(`User not found: ${id}`);
        }
        if (String(iamResponse.data.orgId) !== String(orgId)) {
          throw new Error(`User not in org: ${id}`);
        }
        return {
          userId: new mongoose.Types.ObjectId(id),
          accessLevel: accessLevel || 'read',
        } as { userId: mongoose.Types.ObjectId; accessLevel: 'read' | 'write' };
      }),
    );

    const existing = project.sharedWith || [];
    const existingMap = new Map(existing.map((s: any) => [String(s.userId), s]));

    const newUserIds: string[] = [];
    const updatedUserIds: string[] = [];

    for (const newUser of validatedUsers) {
      const key = String(newUser.userId);
      const existed = existingMap.get(key);
      if (existed) {
        if (existed.accessLevel !== newUser.accessLevel) {
          existed.accessLevel = newUser.accessLevel;
          updatedUserIds.push(key);
        }
      } else {
        existingMap.set(key, newUser);
        newUserIds.push(key);
      }
    }

    project.sharedWith = Array.from(existingMap.values());
    await project.save();

    // Best-effort KB permission sync
    try {
      if (project.kbId) {
        const roleMap: Record<'read' | 'write', string> = {
          read: 'READER',
          write: 'WRITER',
        };
        const role = roleMap[(accessLevel || 'read') as 'read' | 'write'];
        const appConfig = await loadAppConfig();

        // Grant for new users in bulk (single role)
        if (newUserIds.length > 0) {
          await axios.post(`${appConfig.connectorBackend}/api/v1/kb/${project.kbId}/permissions`, {
            requesterId: userId,
            users: newUserIds,
            role: role,
          });
        }
        // Update role for changed users (loop)
        for (const uid of updatedUserIds) {
          await axios.patch(`${appConfig.connectorBackend}/api/v1/kb/${project.kbId}/permissions`, {
            requesterId: userId,
            userId: uid,
            role: role,
          });
        }
      }
    } catch (kbSyncError: any) {
      logger.error('KB permission sync failed during shareProject', {
        error: kbSyncError?.message,
        projectId,
        kbId: project.kbId,
      });
    }

    res.json({ sharedWith: project.sharedWith });
  } catch (error) {
    logger.error('Error sharing project', error);
    next(error);
  }
};

export const unshareProject = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const { userIds } = req.body as { userIds: string[] };

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      createdBy: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    const removeSet = new Set(userIds.map((id) => String(id)));
    // Do not allow removing the owner
    if (removeSet.has(String(project.createdBy))) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Owner cannot be removed from project' });
      return;
    }
    const toRemove = (project.sharedWith || []).filter((u: any) => removeSet.has(String(u.userId)));
    project.sharedWith = (project.sharedWith || []).filter((u: any) => !removeSet.has(String(u.userId)));
    await project.save();

    // Best-effort KB permission removal
    try {
      if (project.kbId) {
        const appConfig = await loadAppConfig();
        for (const u of toRemove) {
          const uid = String(u.userId);
          await axios.delete(`${appConfig.connectorBackend}/api/v1/kb/${project.kbId}/requester/${userId}/user/${uid}/permissions`);
        }
      }
    } catch (kbSyncError: any) {
      logger.error('KB permission removal failed during unshareProject', {
        error: kbSyncError?.message,
        projectId,
        kbId: project.kbId,
      });
    }

    res.json({ sharedWith: project.sharedWith });
  } catch (error) {
    logger.error('Error unsharing project', error);
    next(error);
  }
};


// Memories CRUD
export const listProjectMemories = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      isDeleted: { $ne: true },
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId) },
      ],
    })
      .select('memories')
      .lean();

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    res.json({ memories: project.memories || [] });
  } catch (error) {
    logger.error('Error listing project memories', error);
    next(error);
  }
};

export const createProjectMemory = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const { text, key, tags, approved, sourceConversationId, sourceMessageId } = req.body as Record<string, any>;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      createdBy: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    const memory = {
      key,
      text,
      tags: tags || [],
      approved: approved !== undefined ? Boolean(approved) : true,
      createdBy: new mongoose.Types.ObjectId(userId),
      approvedBy: approved ? new mongoose.Types.ObjectId(userId) : undefined,
      sourceConversationId: sourceConversationId ? new mongoose.Types.ObjectId(sourceConversationId) : undefined,
      sourceMessageId: sourceMessageId ? new mongoose.Types.ObjectId(sourceMessageId) : undefined,
    } as any;

    project.memories = project.memories || [];
    (project.memories as any).push(memory);
    await project.save();

    const created = (project.memories as any)[(project.memories as any).length - 1];
    res.status(HTTP_STATUS.CREATED).json({ memory: created });
  } catch (error) {
    logger.error('Error creating project memory', error);
    next(error);
  }
};

export const updateProjectMemory = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const memoryId = req.params.memoryId;
    const { text, key, tags, approved } = req.body as Record<string, any>;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId), 'sharedWith.accessLevel': 'write' },
      ],
      isDeleted: { $ne: true },
    });

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    const mem = (project.memories || []).find((m: any) => String(m._id) === String(memoryId));
    if (!mem) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Memory not found' });
      return;
    }

    if (text !== undefined) mem.text = text;
    if (key !== undefined) mem.key = key;
    if (tags !== undefined) mem.tags = tags;
    if (approved !== undefined) {
      mem.approved = Boolean(approved);
      mem.approvedBy = Boolean(approved) ? new mongoose.Types.ObjectId(userId) : undefined;
    }

    await project.save();
    res.json({ memory: mem });
  } catch (error) {
    logger.error('Error updating project memory', error);
    next(error);
  }
};

export const deleteProjectMemory = async (
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.user?.orgId;
    const userId = req.user?.userId;
    const projectId = req.params.projectId;
    const memoryId = req.params.memoryId;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      orgId: new mongoose.Types.ObjectId(orgId),
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { 'sharedWith.userId': new mongoose.Types.ObjectId(userId), 'sharedWith.accessLevel': 'write' },
      ],
      isDeleted: { $ne: true },
    });

    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Project not found' });
      return;
    }

    const before = (project.memories || []).length;
    project.memories = (project.memories || []).filter((m: any) => String(m._id) !== String(memoryId));
    if ((project.memories || []).length === before) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Memory not found' });
      return;
    }
    await project.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting project memory', error);
    next(error);
  }
};


