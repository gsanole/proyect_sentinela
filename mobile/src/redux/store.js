import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import artReducer from './slices/artSlice';
import cartReducer from './slices/cartSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    art: artReducer,
    cart: cartReducer,
  },
});

export default store;
