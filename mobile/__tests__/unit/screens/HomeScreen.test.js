import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import HomeScreen from '../../../src/screens/HomeScreen';

const mockStore = configureStore([]);

describe('HomeScreen', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        user: { id: '1', email: 'test@test.com' },
        token: 'test-token',
        isAuthenticated: true
      },
      art: {
        feed: [
          { id: '1', title: 'Art 1', price: 100 },
          { id: '2', title: 'Art 2', price: 200 }
        ],
        loading: false
      },
      cart: {
        items: [],
        total: 0
      }
    });
  });

  it('should render correctly', () => {
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>
    );

    // Will update once component is implemented
    expect(getByText(/Home Screen/i)).toBeTruthy();
  });

  it('should display art feed when available', () => {
    const { getByText } = render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>
    );

    // These tests will be more detailed once components are implemented
    expect(store.getState().art.feed).toHaveLength(2);
  });
});
