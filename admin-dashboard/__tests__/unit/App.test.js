import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(screen).toBeTruthy();
  });

  it('should render login route', () => {
    window.history.pushState({}, 'Login', '/login');
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    expect(screen.getByText(/Admin Login/i)).toBeInTheDocument();
  });
});
