import { expect } from 'chai';
import mongoose from 'mongoose';
import { buildPromptQuery } from '../../../src/modules/prompt_library/services/prompt.service';

describe('PromptLibraryService - buildPromptQuery', () => {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  it('scopes private prompts to owner', () => {
    const query = buildPromptQuery({
      orgId,
      userId,
      filters: { scope: 'private' },
    });
    expect(String(query.orgId)).to.equal(String(orgId));
    expect(String(query.createdBy)).to.equal(String(userId));
    expect(query.visibility).to.equal('private');
    expect(query.isDeleted).to.deep.equal({ $ne: true });
    expect(query.$or).to.be.undefined;
  });

  it('includes both workspace and personal prompts for all scope', () => {
    const query = buildPromptQuery({
      orgId,
      userId,
      filters: {
        scope: 'all',
        tag: 'analysis',
        search: 'customer',
      },
    });
    expect(query.tags).to.equal('analysis');
    expect(query.$or).to.be.an('array');
    expect(query.$or).to.have.lengthOf(5);
    const [workspaceFilter, ownerFilter] = query.$or as any[];
    expect(workspaceFilter.visibility).to.equal('workspace');
    expect(String(ownerFilter.createdBy)).to.equal(String(userId));
  });

  it('filters workspace prompts by category', () => {
    const query = buildPromptQuery({
      orgId,
      userId,
      filters: { scope: 'workspace', category: 'research' },
    });
    expect(query.visibility).to.equal('workspace');
    expect(query.category).to.equal('research');
  });
});






