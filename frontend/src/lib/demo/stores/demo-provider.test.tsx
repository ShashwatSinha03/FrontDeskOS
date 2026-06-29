import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DemoProvider, useDemo, useDemoStore } from './demo-provider';
import { DemoStore } from './store-types';

class TestStore extends DemoStore {
  value = 'initial';

  update(v: string) {
    this.value = v;
    this.notify();
  }

  get snapshot() {
    return this.value;
  }
}

function TestConsumer() {
  const demo = useDemo();
  return <div>{demo.appointments.count}</div>;
}

function TestStoreConsumer({ store }: { store: TestStore }) {
  const value = useDemoStore(store, () => store.snapshot);
  return <div>{value}</div>;
}

describe('DemoProvider', () => {
  it('renders children', () => {
    render(<DemoProvider><div>hello</div></DemoProvider>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('provides stores via useDemo with seeded data', () => {
    render(<DemoProvider><TestConsumer /></DemoProvider>);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('throws useDemo when outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useDemo must be used within DemoProvider');
  });

  it('useDemoStore subscribes to store changes', () => {
    const store = new TestStore();
    const { rerender } = render(<TestStoreConsumer store={store} />);
    expect(screen.getByText('initial')).toBeTruthy();
    act(() => store.update('updated'));
    rerender(<TestStoreConsumer store={store} />);
    expect(screen.getByText('updated')).toBeTruthy();
  });
});
