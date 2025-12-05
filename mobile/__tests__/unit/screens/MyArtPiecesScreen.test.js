import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import MyArtPiecesScreen from '../../../src/screens/MyArtPiecesScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('MyArtPiecesScreen', () => {
  let store;
  let mockNavigation;

  const mockArtPieces = [
    {
      id: 1,
      title: 'Sunset Dreams',
      price: '500.00',
      approval_status: 'approved',
      created_at: '2024-01-15',
      image_url: 'https://example.com/image1.jpg'
    },
    {
      id: 2,
      title: 'Ocean Waves',
      price: '750.00',
      approval_status: 'pending',
      created_at: '2024-01-20',
      image_url: 'https://example.com/image2.jpg'
    },
    {
      id: 3,
      title: 'Mountain View',
      price: '600.00',
      approval_status: 'rejected',
      created_at: '2024-01-10',
      image_url: 'https://example.com/image3.jpg'
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

    api.getMyArtPieces.mockResolvedValue({ data: mockArtPieces });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render list of art pieces', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Sunset Dreams')).toBeTruthy();
      expect(getByText('Ocean Waves')).toBeTruthy();
      expect(getByText('Mountain View')).toBeTruthy();
    });
  });

  it('should display status badges', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/approved/i)).toBeTruthy();
      expect(getByText(/pending/i)).toBeTruthy();
      expect(getByText(/rejected/i)).toBeTruthy();
    });
  });

  it('should filter by approval status', async () => {
    const { getByText, queryByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Sunset Dreams')).toBeTruthy();
    });

    api.getMyArtPieces.mockResolvedValue({
      data: mockArtPieces.filter(p => p.approval_status === 'approved')
    });

    const approvedFilter = getByText(/Approved/);
    fireEvent.press(approvedFilter);

    await waitFor(() => {
      expect(api.getMyArtPieces).toHaveBeenCalledWith({ status: 'approved' });
    });
  });

  it('should search art pieces by title', async () => {
    const { getByPlaceholderText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    const searchInput = getByPlaceholderText(/search/i);
    
    fireEvent.changeText(searchInput, 'sunset');

    await waitFor(() => {
      expect(api.getMyArtPieces).toHaveBeenCalledWith({ search: 'sunset' });
    });
  });

  it('should navigate to add art piece screen when FAB pressed', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      const fab = getByTestId('add-art-fab');
      fireEvent.press(fab);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AddArtPiece');
  });

  it('should navigate to edit screen when art piece clicked', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      const artPiece = getByText('Sunset Dreams');
      fireEvent.press(artPiece);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditArtPiece', {
      artPieceId: 1
    });
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(api.getMyArtPieces).toHaveBeenCalledTimes(1);
    });

    const flatList = getByTestId('art-pieces-list');
    fireEvent(flatList, 'refresh');

    await waitFor(() => {
      expect(api.getMyArtPieces).toHaveBeenCalledTimes(2);
    });
  });

  it('should display empty state when no art pieces', async () => {
    api.getMyArtPieces.mockResolvedValue({ data: [] });

    const { getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/no art pieces/i)).toBeTruthy();
    });
  });

  it('should display error message on API failure', async () => {
    api.getMyArtPieces.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/error/i)).toBeTruthy();
    });
  });

  it('should combine search and filter', async () => {
    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <MyArtPiecesScreen navigation={mockNavigation} />
      </Provider>
    );

    const searchInput = getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'ocean');

    const pendingFilter = getByText(/Pending/);
    fireEvent.press(pendingFilter);

    await waitFor(() => {
      expect(api.getMyArtPieces).toHaveBeenCalledWith({
        search: 'ocean',
        status: 'pending'
      });
    });
  });
});
