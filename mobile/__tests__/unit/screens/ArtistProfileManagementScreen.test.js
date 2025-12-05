import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ArtistProfileManagementScreen from '../../../src/screens/ArtistProfileManagementScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('ArtistProfileManagementScreen', () => {
  let store;
  let mockNavigation;

  const mockProfile = {
    id: 1,
    first_name: 'Jane',
    last_name: 'Artist',
    bio: 'Contemporary artist specializing in abstract paintings.',
    portfolio_url: 'https://janeartist.com',
    approval_status: 'approved'
  };

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: { id: '1', email: 'artist@test.com', role: 'artist' },
        token: 'test-token',
        isAuthenticated: true
      }
    });

    mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn()
    };

    api.getArtistProfile.mockResolvedValue({ data: mockProfile });
    api.updateArtistProfile.mockResolvedValue({ data: { ...mockProfile, bio: 'Updated bio' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display existing profile data', async () => {
    const { getByDisplayValue } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(api.getArtistProfile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
      expect(getByDisplayValue('Artist')).toBeTruthy();
      expect(getByDisplayValue(/Contemporary artist/)).toBeTruthy();
      expect(getByDisplayValue('https://janeartist.com')).toBeTruthy();
    });
  });

  it('should update profile successfully', async () => {
    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
    });

    const bioInput = getByDisplayValue(/Contemporary artist/);
    fireEvent.changeText(bioInput, 'Updated bio with new information about my work.');

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(api.updateArtistProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Artist',
        bio: 'Updated bio with new information about my work.',
        portfolioUrl: 'https://janeartist.com'
      });
    });
  });

  it('should validate required fields', async () => {
    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
    });

    const bioInput = getByDisplayValue(/Contemporary artist/);
    fireEvent.changeText(bioInput, '');

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/required/i)).toBeTruthy();
    });

    expect(api.updateArtistProfile).not.toHaveBeenCalled();
  });

  it('should handle portfolio URL validation', async () => {
    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('https://janeartist.com')).toBeTruthy();
    });

    const urlInput = getByDisplayValue('https://janeartist.com');
    fireEvent.changeText(urlInput, 'not-a-valid-url');

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/valid url/i)).toBeTruthy();
    });

    expect(api.updateArtistProfile).not.toHaveBeenCalled();
  });

  it('should navigate back on successful save', async () => {
    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
    });

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('should display error message on API failure', async () => {
    api.updateArtistProfile.mockRejectedValue(new Error('Update failed'));

    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
    });

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/failed/i)).toBeTruthy();
    });
  });

  it('should show loading state during save', async () => {
    api.updateArtistProfile.mockImplementation(() => new Promise(() => {}));

    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('Jane')).toBeTruthy();
    });

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/Saving/i)).toBeTruthy();
    });
  });

  it('should handle keyboard avoiding behavior', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    expect(getByTestId('keyboard-avoiding-view')).toBeTruthy();
  });

  it('should allow clearing portfolio URL', async () => {
    const { getByDisplayValue, getByText } = render(
      <Provider store={store}>
        <ArtistProfileManagementScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByDisplayValue('https://janeartist.com')).toBeTruthy();
    });

    const urlInput = getByDisplayValue('https://janeartist.com');
    fireEvent.changeText(urlInput, '');

    const saveButton = getByText(/Save/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(api.updateArtistProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolioUrl: ''
        })
      );
    });
  });
});
