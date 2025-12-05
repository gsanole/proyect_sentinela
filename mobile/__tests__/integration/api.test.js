import api from '../../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('API Service', () => {
  beforeEach(() => {
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  it('should add authorization header when token exists', async () => {
    AsyncStorage.getItem.mockResolvedValue('test-token');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    await api.get('/test-endpoint');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
  });

  it('should handle successful responses', async () => {
    const mockData = { success: true, data: { id: '1', title: 'Test' } };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await api.get('/art-pieces');

    expect(result).toEqual(mockData);
  });

  it('should handle error responses', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: { message: 'Bad request' } })
    });

    await expect(api.get('/art-pieces')).rejects.toThrow();
  });

  it('should handle 401 errors by clearing token', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: 'Unauthorized' } })
    });

    try {
      await api.get('/protected-endpoint');
    } catch (error) {
      // Expected to fail
    }

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });
});
