import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InviteUserModal } from './UsersRolesScreen';

// M13 — the invite form is react-hook-form + zod now; assert the validation actually gates submit
// (email format, and scoped roles requiring at least one assigned casino) rather than the old raw
// useState + disabled-button checks.
const TENANTS = [
  { id: 't1', name: 'Aurora Bay' },
  { id: 't2', name: 'Ruby Nights' },
];

function setup() {
  const onInvite = vi.fn();
  render(<InviteUserModal open onClose={() => {}} tenants={TENANTS} onInvite={onInvite} />);
  return { onInvite, user: userEvent.setup() };
}

describe('InviteUserModal validation (M13)', () => {
  it('blocks submit on an invalid email', async () => {
    const { onInvite, user } = setup();
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('requires at least one casino for a scoped role', async () => {
    const { onInvite, user } = setup();
    // Default role (Tenant Admin) is scoped; a valid email alone must not be enough.
    await user.type(screen.getByPlaceholderText(/name@casino\.com/i), 'gm@aurora.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/assign at least one casino/i)).toBeInTheDocument();
    expect(onInvite).not.toHaveBeenCalled();
  });

  it('submits a valid, scoped invite', async () => {
    const { onInvite, user } = setup();
    await user.type(screen.getByPlaceholderText(/name@casino\.com/i), 'gm@aurora.com');
    await user.click(screen.getByLabelText(/aurora bay/i));
    await user.click(screen.getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(onInvite).toHaveBeenCalledTimes(1));
    expect(onInvite.mock.calls[0][0]).toMatchObject({
      email: 'gm@aurora.com',
      tenantScope: ['t1'],
    });
  });
});
