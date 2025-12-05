import { createSlice } from '@reduxjs/toolkit';

const artSlice = createSlice({
  name: 'art',
  initialState: {
    feed: [],
    searchResults: [],
    selectedPiece: null,
    loading: false,
    filters: {
      category: null,
      minPrice: null,
      maxPrice: null,
      medium: null,
    },
  },
  reducers: {
    setFeed: (state, action) => {
      state.feed = action.payload;
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setSelectedPiece: (state, action) => {
      state.selectedPiece = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        category: null,
        minPrice: null,
        maxPrice: null,
        medium: null,
      };
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setFeed,
  setSearchResults,
  setSelectedPiece,
  setFilters,
  clearFilters,
  setLoading,
} = artSlice.actions;
export default artSlice.reducer;
