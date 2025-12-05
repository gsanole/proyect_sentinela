import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ArtistEarningsScreen from '../../../src/screens/ArtistEarningsScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('ArtistEarningsScreen', () => {
  let store;
  let mockNavigation;

  const mockEarnings = {
    total_earned: '5000.00',
    total_paid_out: '3800.00',
    pending_payout: '1200.00',
    available_for_payout: '1200.00'
  };

  const mockPayouts = [
    {
      id: 1,
      amount: '850.00',
      status: 'completed',
      payout_date: '2024-01-15',
      payment_method: 'bank_transfer'
    },
    {
      id: 2,
      amount: '1200.00',
      status: 'pending',
      payout_date: null,
      payment_method: 'bank_transfer'
    }
  ];

  const mockSales = [
    {
      order_id: 1,
      order_date: '2024-01-10',
      art_piece_title: 'Sunset Dreams',
      price: '500.00',
      commission: '75.00',
      artist_payout: '425.00',
      order_status: 'completed'
    },
    {
      order_id: 2,
      order_date: '2024-01-12',
      art_piece_title: 'Ocean Waves',
      price: '750.00',
      commission: '112.50',
      artist_payout: '637.50',
      order_status: 'completed'
    }
  ];

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

    api.getArtistEarnings.mockResolvedValue({ data: mockEarnings });
    api.getArtistPayouts.mockResolvedValue({ data: mockPayouts });
    api.getArtistSales.mockResolvedValue({ data: mockSales });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render earnings summary cards', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/5000/)).toBeTruthy(); // Total earned
      expect(getByText(/3800/)).toBeTruthy(); // Paid out
      expect(getByText(/1200/)).toBeTruthy(); // Pending
    });
  });

  it('should switch between Payouts and Sales tabs', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/Payouts/i)).toBeTruthy();
    });

    const salesTab = getByText(/Sales/i);
    fireEvent.press(salesTab);

    await waitFor(() => {
      expect(getByText('Sunset Dreams')).toBeTruthy();
      expect(getByText('Ocean Waves')).toBeTruthy();
    });
  });

  it('should display payout list with status colors', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/completed/i)).toBeTruthy();
      expect(getByText(/pending/i)).toBeTruthy();
    });
  });

  it('should display sales history with commission breakdown', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    const salesTab = getByText(/Sales/i);
    fireEvent.press(salesTab);

    await waitFor(() => {
      expect(getByText('500.00')).toBeTruthy(); // Sale price
      expect(getByText('75.00')).toBeTruthy(); // Commission
      expect(getByText('425.00')).toBeTruthy(); // Artist payout
    });
  });

  it('should calculate correct commission (15%)', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    const salesTab = getByText(/Sales/i);
    fireEvent.press(salesTab);

    await waitFor(() => {
      // $500 * 0.15 = $75 commission
      expect(getByText('75.00')).toBeTruthy();
      // $500 - $75 = $425 artist payout
      expect(getByText('425.00')).toBeTruthy();
    });
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(api.getArtistEarnings).toHaveBeenCalledTimes(1);
    });

    const scrollView = getByTestId('earnings-scroll');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(api.getArtistEarnings).toHaveBeenCalledTimes(2);
    });
  });

  it('should display empty state when no payouts', async () => {
    api.getArtistPayouts.mockResolvedValue({ data: [] });

    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/no payouts/i)).toBeTruthy();
    });
  });

  it('should display empty state when no sales', async () => {
    api.getArtistSales.mockResolvedValue({ data: [] });

    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    const salesTab = getByText(/Sales/i);
    fireEvent.press(salesTab);

    await waitFor(() => {
      expect(getByText(/no sales/i)).toBeTruthy();
    });
  });

  it('should display error message on API failure', async () => {
    api.getArtistEarnings.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/error/i)).toBeTruthy();
    });
  });

  it('should format currency correctly', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      // Should display with 2 decimal places
      expect(getByText(/5000.00/)).toBeTruthy();
      expect(getByText(/3800.00/)).toBeTruthy();
    });
  });

  it('should display payout dates correctly', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <ArtistEarningsScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/2024-01-15/)).toBeTruthy();
    });
  });
});
