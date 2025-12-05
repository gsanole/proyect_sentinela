import cartReducer, { addToCart, removeFromCart, clearCart } from '../../../src/redux/slices/cartSlice';

describe('Cart Slice', () => {
  const initialState = {
    items: [],
    total: 0
  };

  it('should return initial state', () => {
    expect(cartReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle addToCart', () => {
    const item = {
      id: '1',
      title: 'Test Art',
      price: 100.00,
      artist: 'Test Artist'
    };

    const actual = cartReducer(initialState, addToCart(item));

    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(item);
    expect(actual.total).toBe(100.00);
  });

  it('should not add duplicate items to cart', () => {
    const item = { id: '1', title: 'Test Art', price: 100.00 };
    
    let state = cartReducer(initialState, addToCart(item));
    state = cartReducer(state, addToCart(item));

    expect(state.items).toHaveLength(1);
    expect(state.total).toBe(100.00);
  });

  it('should add multiple different items', () => {
    const item1 = { id: '1', title: 'Art 1', price: 100.00 };
    const item2 = { id: '2', title: 'Art 2', price: 200.00 };

    let state = cartReducer(initialState, addToCart(item1));
    state = cartReducer(state, addToCart(item2));

    expect(state.items).toHaveLength(2);
    expect(state.total).toBe(300.00);
  });

  it('should handle removeFromCart', () => {
    const item1 = { id: '1', title: 'Art 1', price: 100.00 };
    const item2 = { id: '2', title: 'Art 2', price: 200.00 };

    let state = cartReducer(initialState, addToCart(item1));
    state = cartReducer(state, addToCart(item2));
    state = cartReducer(state, removeFromCart('1'));

    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
    expect(state.total).toBe(200.00);
  });

  it('should handle clearCart', () => {
    const item1 = { id: '1', title: 'Art 1', price: 100.00 };
    const item2 = { id: '2', title: 'Art 2', price: 200.00 };

    let state = cartReducer(initialState, addToCart(item1));
    state = cartReducer(state, addToCart(item2));
    state = cartReducer(state, clearCart());

    expect(state.items).toHaveLength(0);
    expect(state.total).toBe(0);
  });
});
