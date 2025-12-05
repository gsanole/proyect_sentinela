import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ArtistApplicationScreen from '../../../src/screens/ArtistApplicationScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('ArtistApplicationScreen', () => {
  let store;
  let mockNavigation;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: { id: '1', email: 'buyer@test.com', role: 'buyer' },
        token: 'test-token',
        isAuthenticated: true
      }
    });

    mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn()
    };

    api.applyAsArtist.mockResolvedValue({
      data: {
        id: 1,
        approval_status: 'pending',
        bio: 'Test bio',
        portfolio_url: 'https://portfolio.com'
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render application form', () => {
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    expect(getByPlaceholderText(/bio/i)).toBeTruthy();
    expect(getByText(/Submit Application/i)).toBeTruthy();
  });

  it('should validate bio minimum length', async () => {
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, 'Too short');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/at least 50 characters/i)).toBeTruthy();
    });

    expect(api.applyAsArtist).not.toHaveBeenCalled();
  });

  it('should accept bio with 50+ characters', async () => {
    const validBio = 'I am a passionate contemporary artist with over 10 years of experience.';
    
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, validBio);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(api.applyAsArtist).toHaveBeenCalledWith({
        bio: validBio,
        portfolioUrl: ''
      });
    });
  });

  it('should show character counter', () => {
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    
    fireEvent.changeText(bioInput, 'Test bio content here');

    expect(getByText(/21/)).toBeTruthy(); // Character count
  });

  it('should submit application with portfolio URL', async () => {
    const validBio = 'I am a talented artist with extensive experience in contemporary art.';
    const portfolioUrl = 'https://myportfolio.com';
    
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const urlInput = getByPlaceholderText(/portfolio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, validBio);
    fireEvent.changeText(urlInput, portfolioUrl);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(api.applyAsArtist).toHaveBeenCalledWith({
        bio: validBio,
        portfolioUrl
      });
    });
  });

  it('should navigate to dashboard on successful submission', async () => {
    const validBio = 'I am a passionate contemporary artist with extensive experience.';
    
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, validBio);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });

  it('should display error message on API failure', async () => {
    api.applyAsArtist.mockRejectedValue(new Error('Application failed'));
    
    const validBio = 'I am a passionate contemporary artist with extensive experience.';
    
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, validBio);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/failed/i)).toBeTruthy();
    });
  });

  it('should display loading state during submission', async () => {
    api.applyAsArtist.mockImplementation(() => new Promise(() => {}));
    
    const validBio = 'I am a passionate contemporary artist with extensive experience.';
    
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    const bioInput = getByPlaceholderText(/bio/i);
    const submitButton = getByText(/Submit Application/i);

    fireEvent.changeText(bioInput, validBio);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/Submitting/i)).toBeTruthy();
    });
  });

  it('should display benefits section', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistApplicationScreen navigation={mockNavigation} />
      </Provider>
    );

    expect(getByText(/benefits/i)).toBeTruthy();
  });
});
