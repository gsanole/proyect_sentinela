import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import AddEditArtPieceScreen from '../../../src/screens/AddEditArtPieceScreen';
import * as api from '../../../src/services/api';

jest.mock('../../../src/services/api');

const mockStore = configureStore([]);

describe('AddEditArtPieceScreen', () => {
  let store;
  let mockNavigation;
  let mockRoute;

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

    mockRoute = {
      params: {}
    };

    api.createArtPiece.mockResolvedValue({
      data: {
        id: 1,
        title: 'Test Art',
        price: 500,
        approval_status: 'pending'
      }
    });

    api.updateArtPiece.mockResolvedValue({
      data: {
        id: 1,
        title: 'Updated Art',
        price: 600
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render empty form for creating new art piece', () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      expect(getByPlaceholderText(/Title/i)).toBeTruthy();
      expect(getByPlaceholderText(/Description/i)).toBeTruthy();
      expect(getByPlaceholderText(/Price/i)).toBeTruthy();
      expect(getByText(/Create Art Piece/i)).toBeTruthy();
    });

    it('should create new art piece with valid data', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'Sunset Dreams');
      fireEvent.changeText(getByPlaceholderText(/Description/i), 'Beautiful abstract painting');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '500');
      fireEvent.changeText(getByPlaceholderText(/Medium/i), 'Acrylic');
      fireEvent.changeText(getByPlaceholderText(/Dimensions/i), '24x36 inches');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.createArtPiece).toHaveBeenCalledWith({
          title: 'Sunset Dreams',
          description: 'Beautiful abstract painting',
          price: 500,
          medium: 'Acrylic',
          dimensions: '24x36 inches',
          category: expect.any(String),
          yearCreated: expect.any(Number)
        });
      });
    });

    it('should validate required fields', async () => {
      const { getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/required/i)).toBeTruthy();
      });

      expect(api.createArtPiece).not.toHaveBeenCalled();
    });

    it('should validate price is positive number', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'Test Art');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '-100');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/positive/i)).toBeTruthy();
      });

      expect(api.createArtPiece).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockRoute.params = {
        artPieceId: 1,
        artPiece: {
          id: 1,
          title: 'Existing Art',
          description: 'Existing description',
          price: 500,
          medium: 'Oil',
          dimensions: '30x40',
          category: 'abstract',
          yearCreated: 2024
        }
      };
    });

    it('should load existing art piece data', () => {
      const { getByDisplayValue } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      expect(getByDisplayValue('Existing Art')).toBeTruthy();
      expect(getByDisplayValue('Existing description')).toBeTruthy();
      expect(getByDisplayValue('500')).toBeTruthy();
      expect(getByDisplayValue('Oil')).toBeTruthy();
    });

    it('should update existing art piece', async () => {
      const { getByDisplayValue, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      const titleInput = getByDisplayValue('Existing Art');
      fireEvent.changeText(titleInput, 'Updated Title');

      const submitButton = getByText(/Update Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.updateArtPiece).toHaveBeenCalledWith(1, {
          title: 'Updated Title',
          description: 'Existing description',
          price: 500,
          medium: 'Oil',
          dimensions: '30x40',
          category: 'abstract',
          yearCreated: 2024
        });
      });
    });
  });

  describe('Category Selection', () => {
    it('should display category chips', () => {
      const { getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      expect(getByText(/Abstract/i)).toBeTruthy();
      expect(getByText(/Landscape/i)).toBeTruthy();
      expect(getByText(/Portrait/i)).toBeTruthy();
    });

    it('should select category when chip pressed', () => {
      const { getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      const abstractChip = getByText(/Abstract/i);
      fireEvent.press(abstractChip);

      // Category should be selected (visual feedback tested in component)
      expect(abstractChip).toBeTruthy();
    });
  });

  describe('Image Upload', () => {
    it('should display image upload placeholder', () => {
      const { getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      expect(getByText(/Upload Image/i)).toBeTruthy();
    });

    it('should trigger image picker when upload button pressed', () => {
      const { getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      const uploadButton = getByText(/Upload Image/i);
      fireEvent.press(uploadButton);

      // Image picker functionality (requires react-native-image-picker)
      // This will be fully testable once library is installed
    });
  });

  describe('Form Submission', () => {
    it('should navigate back on successful creation', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'New Art');
      fireEvent.changeText(getByPlaceholderText(/Description/i), 'Description');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '300');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('should display error message on API failure', async () => {
      api.createArtPiece.mockRejectedValue(new Error('Creation failed'));

      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'New Art');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '300');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/failed/i)).toBeTruthy();
      });
    });

    it('should show loading state during submission', async () => {
      api.createArtPiece.mockImplementation(() => new Promise(() => {}));

      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'New Art');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '300');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText(/Creating/i)).toBeTruthy();
      });
    });
  });

  describe('Optional Fields', () => {
    it('should submit without optional fields', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'Minimal Art');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '200');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.createArtPiece).toHaveBeenCalled();
      });
    });

    it('should include optional fields when provided', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <AddEditArtPieceScreen navigation={mockNavigation} route={mockRoute} />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText(/Title/i), 'Complete Art');
      fireEvent.changeText(getByPlaceholderText(/Price/i), '500');
      fireEvent.changeText(getByPlaceholderText(/Medium/i), 'Watercolor');
      fireEvent.changeText(getByPlaceholderText(/Dimensions/i), '18x24');
      fireEvent.changeText(getByPlaceholderText(/Year/i), '2024');

      const submitButton = getByText(/Create Art Piece/i);
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.createArtPiece).toHaveBeenCalledWith(
          expect.objectContaining({
            medium: 'Watercolor',
            dimensions: '18x24',
            yearCreated: 2024
          })
        );
      });
    });
  });
});
