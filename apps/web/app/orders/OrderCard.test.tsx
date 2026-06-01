import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils/render';
import { OrderCard } from './OrderCard';
import type { OrderListItem } from '@/lib/types';

const order = (over: Partial<OrderListItem> = {}): OrderListItem =>
  ({
    id: 'ord_ABC123XYZ789',
    conversationId: 'c1',
    items: [{ product_id: 'p', variant_id: 'v', qty: 2, price: 750 }],
    customerName: 'Tahmina',
    customerPhone: '01713-456789',
    customerAddress: 'House 14, Banani, Dhaka',
    total: 1500,
    currency: 'BDT',
    paymentStatus: 'pending',
    paymentLink: null,
    status: 'created',
    createdAt: '2026-01-01T10:00:00Z',
    ...over,
  }) as unknown as OrderListItem;

describe('OrderCard', () => {
  it('renders customer + total + last-6 of order id', () => {
    renderWithProviders(
      <OrderCard
        order={order()}
        onPrint={jest.fn()}
        onMarkPaid={jest.fn()}
        onSetStatus={jest.fn()}
      />,
    );
    expect(screen.getByText('Tahmina')).toBeInTheDocument();
    expect(screen.getByText(/#XYZ789/)).toBeInTheDocument();
    expect(screen.getByText('৳1,500')).toBeInTheDocument();
  });

  it('shows Mark paid when pending and fires the callback', () => {
    const onMarkPaid = jest.fn();
    renderWithProviders(
      <OrderCard
        order={order({ paymentStatus: 'pending' })}
        onPrint={jest.fn()}
        onMarkPaid={onMarkPaid}
        onSetStatus={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }));
    expect(onMarkPaid).toHaveBeenCalledWith('ord_ABC123XYZ789');
  });

  it('hides Mark paid when already paid', () => {
    renderWithProviders(
      <OrderCard
        order={order({ paymentStatus: 'paid' })}
        onPrint={jest.fn()}
        onMarkPaid={jest.fn()}
        onSetStatus={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument();
  });

  it('Print button calls onPrint', () => {
    const onPrint = jest.fn();
    renderWithProviders(
      <OrderCard
        order={order()}
        onPrint={onPrint}
        onMarkPaid={jest.fn()}
        onSetStatus={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /print order/i }));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});
