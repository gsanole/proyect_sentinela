import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ArtistDashboardScreen from '../../../src/screens/ArtistDashboardScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('ArtistDashboardScreen', () => {
  let store;
  let mockNavigation;

  const mockDashboardData = {
    total_revenue: '5000.00',
    total_sales: 25,
    total_art_pieces: 10,
    pending_art_pieces: 2,
    approved_art_pieces: 8,
    rejected_art_pieces: 0,
    followers_count: 150,
    pending_payout: '1200.00',
    recent_performance: {
      week: '850.00',
      month: '3200.00'
    },
    top_sellers: [
      { id: 1, title: 'Sunset', sales: 10, revenue: '5000.00' },
      { id: 2, title: 'Ocean', sales: 8, revenue: '4000.00' }
    ]
  };

  const mockProfile = {
    approval_status: 'approved',
    bio: 'Test artist bio',
    portfolio_url: 'https://portfolio.com'
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

    api.getArtistDashboard.mockResolvedValue({ data: mockDashboardData });
    api.getArtistProfile.mockResolvedValue({ data: mockProfile });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with statistics', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(api.getArtistDashboard).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getByText(/5000/)).toBeTruthy(); // Revenue
      expect(getByText(/25/)).toBeTruthy(); // Total sales
      expect(getByText(/10/)).toBeTruthy(); // Art pieces
      expect(getByText(/150/)).toBeTruthy(); // Followers
    });
  });

  it('should display pending payout alert when available', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/1200/)).toBeTruthy(); // Pending payout amount
    });
  });

  it('should show pending approval status for pending artists', async () => {
    api.getArtistProfile.mockResolvedValue({
      data: { ...mockProfile, approval_status: 'pending' }
    });

    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/pending/i)).toBeTruthy();
    });
  });

  it('should navigate to My Art Pieces when quick action clicked', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      const myArtButton = getByText(/My Art/i);
      fireEvent.press(myArtButton);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyArtPieces');
  });

  it('should navigate to Earnings when earnings card clicked', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      const earningsCard = getByText(/Revenue/i);
      fireEvent.press(earningsCard);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ArtistEarnings');
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(api.getArtistDashboard).toHaveBeenCalledTimes(1);
    });

    const scrollView = getByTestId('dashboard-scroll');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(api.getArtistDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it('should display error message when API fails', async () => {
    api.getArtistDashboard.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/error/i)).toBeTruthy();
    });
  });

  it('should display loading state', () => {
    api.getArtistDashboard.mockImplementation(() => new Promise(() => {}));

    const { getByTestId } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should display top selling pieces', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistDashboardScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/Sunset/)).toBeTruthy();
      expect(getByText(/Ocean/)).toBeTruthy();
    });
  });
});
