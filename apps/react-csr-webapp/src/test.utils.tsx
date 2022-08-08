import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

type ProvidersProps = {
  children: React.ReactNode;
};

const Provider = ({ children }: ProvidersProps) => <>{children}</>;

const customRender = (
  ui: React.ReactElement,
  options?: object
): ReturnType<typeof render> =>
  render(ui, {
    wrapper: Provider,
    ...options,
  });

export * from '@testing-library/react';
export { customRender as render };
