import axios from 'src/utils/axios';

export type PromptVisibility = 'private' | 'users' | 'workspace';
export type PromptAccessLevel = 'read' | 'write';

export interface PromptTemplate {
  _id: string;
  orgId: string;
  createdBy: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  visibility: PromptVisibility;
  sharedWith?: Array<{ userId: string; accessLevel: PromptAccessLevel }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptFilters {
  visibility?: 'all' | PromptVisibility;
  category?: string;
  tag?: string;
  search?: string;
  sortBy?: 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PromptPayload {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  visibility?: PromptVisibility;
}

export type CreatePromptPayload = Required<
  Pick<PromptPayload, 'title' | 'content'>
> &
  Omit<PromptPayload, 'title' | 'content'>;

export interface PromptAssistantPayload {
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

const BASE_URL = '/api/v1/prompts';

export const PromptLibraryApi = {
  async list(filters: PromptFilters = {}) {
    const { data } = await axios.get<{ prompts: PromptTemplate[] }>(BASE_URL, {
      params: filters,
    });
    return data.prompts;
  },

  async create(payload: CreatePromptPayload) {
    const { data } = await axios.post<{ prompt: PromptTemplate }>(
      BASE_URL,
      payload,
    );
    return data.prompt;
  },

  async update(promptId: string, payload: PromptPayload) {
    const { data } = await axios.put<{ prompt: PromptTemplate }>(
      `${BASE_URL}/${promptId}`,
      payload,
    );
    return data.prompt;
  },

  async remove(promptId: string) {
    await axios.delete(`${BASE_URL}/${promptId}`);
  },

  async setVisibility(promptId: string, visibility: PromptVisibility) {
    const { data } = await axios.post<{ prompt: PromptTemplate }>(
      `${BASE_URL}/${promptId}/share`,
      { visibility },
    );
    return data.prompt;
  },

  async shareWithUsers(
    promptId: string,
    userIds: string[],
    accessLevel: PromptAccessLevel = 'read',
  ) {
    const { data } = await axios.post<{ prompt: PromptTemplate }>(
      `${BASE_URL}/${promptId}/share-users`,
      { userIds, accessLevel },
    );
    return data.prompt;
  },

  async getMembers(promptId: string) {
    const { data } = await axios.get<{
      sharedWith: Array<{ userId: string; accessLevel: PromptAccessLevel }>;
      ownerId: string;
    }>(`${BASE_URL}/${promptId}/members`);
    return data;
  },

  async removeMember(promptId: string, userId: string) {
    await axios.post(`${BASE_URL}/${promptId}/unshare-users`, { userIds: [userId] });
  },

  async updateMemberAccess(
    promptId: string,
    userId: string,
    accessLevel: PromptAccessLevel,
  ) {
    const { data } = await axios.post<{ prompt: PromptTemplate }>(
      `${BASE_URL}/${promptId}/share-users`,
      { userIds: [userId], accessLevel },
    );
    return data.prompt;
  },

  async assist(payload: PromptAssistantPayload) {
    const { data } = await axios.post<{
      suggestion: {
        title: string;
        description: string;
        content: string;
        guidelines: string[];
      };
    }>(`${BASE_URL}/assistant`, payload);
    return data.suggestion;
  },
};


