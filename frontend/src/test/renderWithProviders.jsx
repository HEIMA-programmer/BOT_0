import React from 'react';
import { App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

export function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <AntdApp>{ui}</AntdApp>
    </MemoryRouter>
  );
}
