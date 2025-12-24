import { expect } from 'chai';

import {
  listKnowledgeBases,
  linkKnowledgeBaseToKnowledgeBase,
} from '../../src/modules/knowledge_base/controllers/kb_controllers';
import type { AuthenticatedUserRequest } from '../../src/libs/middlewares/types';
import type { Response, NextFunction } from 'express';
import type { AppConfig } from '../../src/modules/tokens_manager/config/config';

// Simple helper to create a mock AppConfig with only the field we need
const createMockAppConfig = (connectorBackend: string): AppConfig =>
  ({
    connectorBackend,
  } as AppConfig);

describe('knowledge_base controllers - listKnowledgeBases', () => {
  it('builds connector URL with pagination, search, permissions and sorting', async () => {
    const appConfig = createMockAppConfig('https://connector.example.com');

    const req = {
      query: {
        page: '2',
        limit: '10',
        search: 'default',
        permissions: 'OWNER,READER',
        sortBy: 'name',
        sortOrder: 'asc',
      },
      user: {
        userId: 'user-1',
        orgId: 'org-1',
      },
      headers: {
        authorization: 'Bearer test-token',
      },
    } as unknown as AuthenticatedUserRequest;

    let capturedUrl = '';
    const res = {
      status: () => res,
      json: (payload: any) => payload,
    } as unknown as Response;

    const next: NextFunction = (err?: any) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    };

    // Wrap controller and temporarily monkey‑patch global fetch via executeConnectorCommand
    const handler = listKnowledgeBases(appConfig);

    // Monkey-patch global fetch used indirectly by executeConnectorCommand via axios/command
    // Instead of stubbing deep internals, we intercept axios by temporarily overriding process.env
    // and validating behaviour through thrown error message that includes URL.
    (global as any).fetch = async (url: string) => {
      capturedUrl = url;
      return {
        status: 200,
        json: async () => ({ knowledgeBases: [], pagination: { page: 2, limit: 10 } }),
      };
    };

    await handler(req, res, next);

    expect(capturedUrl).to.include('https://connector.example.com/api/v1/kb/');
    expect(capturedUrl).to.include('page=2');
    expect(capturedUrl).to.include('limit=10');
    expect(capturedUrl).to.include('search=default');
    expect(capturedUrl).to.include('permissions=OWNER%2CREADER');
    expect(capturedUrl).to.include('sort_by=name');
    expect(capturedUrl).to.include('sort_order=asc');
  });
});

describe('knowledge_base controllers - linkKnowledgeBaseToKnowledgeBase', () => {
  it('proxies POST /:kbId/links to connector backend /api/v1/kb/:kbId/links', async () => {
    const appConfig = createMockAppConfig('https://connector.example.com');

    const req = {
      params: {
        kbId: 'ac67274b-5e90-4229-9ffb-25bee7610bca',
      },
      body: {
        linkedKbId: '92cd3b24-79b8-4f03-aac5-c3c39fd5700a',
      },
      user: {
        userId: 'user-1',
        orgId: 'org-1',
      },
      headers: {
        authorization: 'Bearer test-token',
      },
    } as unknown as AuthenticatedUserRequest;

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: any = undefined;

    const res = {
      status: () => res,
      json: (_payload: any) => _payload,
    } as unknown as Response;

    const next: NextFunction = (err?: any) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    };

    const handler = linkKnowledgeBaseToKnowledgeBase(appConfig);

    (global as any).fetch = async (url: string, options: any) => {
      capturedUrl = url;
      capturedMethod = options?.method;
      capturedBody = options?.body ? JSON.parse(options.body) : undefined;
      return {
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
      };
    };

    await handler(req, res, next);

    expect(capturedUrl).to.equal(
      'https://connector.example.com/api/v1/kb/ac67274b-5e90-4229-9ffb-25bee7610bca/links',
    );
    expect(capturedMethod).to.equal('POST');
    expect(capturedBody).to.deep.equal({ linkedKbId: req.body.linkedKbId });
  });
});


