import { digitalKey } from '../src/native/digitalKey';

describe('digital key SDK stub', () => {
  it('unlocks when a key ref is provisioned', async () => {
    await expect(digitalKey.unlock('key-123')).resolves.toEqual({ status: 'unlocked' });
  });

  it('errors when nothing is provisioned to present', async () => {
    await expect(digitalKey.unlock('')).resolves.toEqual({ status: 'error' });
  });
});
