import authReducer, { setCredentials, logout, setLoading } from '../../../src/redux/slices/authSlice';

describe('Auth Slice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setCredentials', () => {
    const user = { id: '1', email: 'test@test.com', role: 'buyer' };
    const token = 'test-token';

    const actual = authReducer(initialState, setCredentials({ user, token }));

    expect(actual.user).toEqual(user);
    expect(actual.token).toEqual(token);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const authenticatedState = {
      user: { id: '1', email: 'test@test.com' },
      token: 'test-token',
      isAuthenticated: true,
      loading: false
    };

    const actual = authReducer(authenticatedState, logout());

    expect(actual.user).toBeNull();
    expect(actual.token).toBeNull();
    expect(actual.isAuthenticated).toBe(false);
  });

  it('should handle setLoading', () => {
    const actual = authReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);

    const actual2 = authReducer(actual, setLoading(false));
    expect(actual2.loading).toBe(false);
  });
});
