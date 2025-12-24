import { describe, it } from 'mocha';
import { expect } from 'chai';

import { webSearchRequestSchema } from '../../src/modules/enterprise_search/validators/es_validators';

describe('webSearchRequestSchema', () => {
  it('accepts a minimal payload with just a query', () => {
    const payload = {
      body: {
        query: 'aktuelles wetter berlin',
      },
    };

    const parsed = webSearchRequestSchema.parse(payload);
    expect(parsed.body.query).to.equal('aktuelles wetter berlin');
  });

  it('enforces query presence', () => {
    expect(() => webSearchRequestSchema.parse({ body: {} as any })).to.throw();
  });
});

