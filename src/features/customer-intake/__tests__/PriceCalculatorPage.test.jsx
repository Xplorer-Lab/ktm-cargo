import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PriceCalculatorPage from '../pages/PriceCalculatorPage.jsx';
import { createCustomerInquiry } from '../api/customerInquiries.js';

jest.mock('../api/customerInquiries.js', () => ({
  createCustomerInquiry: jest.fn(),
}));

describe('PriceCalculatorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createCustomerInquiry.mockResolvedValue({ success: true });
  });

  test('shows live KTM cargo estimates from the pricing source of truth', async () => {
    const user = userEvent.setup();
    render(<PriceCalculatorPage />);

    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), '3');
    await user.selectOptions(screen.getByLabelText(/cargo mode/i), 'air');
    expect(screen.getByText(/900 THB/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/cargo mode/i), 'land');
    expect(screen.getByText(/540 THB/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), '1.2');
    await user.selectOptions(screen.getByLabelText(/cargo mode/i), 'air');
    expect(screen.getByText(/1.5 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/450 THB/i)).toBeInTheDocument();
  });

  test('submits a public quote request as a customer inquiry only', async () => {
    const user = userEvent.setup();
    render(<PriceCalculatorPage />);

    await user.type(screen.getByLabelText(/customer name/i), 'Aye Aye');
    await user.selectOptions(screen.getByLabelText(/preferred contact/i), 'line');
    await user.type(screen.getByLabelText(/contact detail/i), '@ayeaye');
    await user.selectOptions(screen.getByLabelText(/cargo mode/i), 'land');
    await user.clear(screen.getByLabelText(/weight/i));
    await user.type(screen.getByLabelText(/weight/i), '2');
    await user.type(screen.getByLabelText(/item description/i), 'Clothes and snacks');
    await user.type(screen.getByLabelText(/notes/i), 'Need pickup this week');

    await user.click(screen.getByRole('button', { name: /request quote/i }));

    await waitFor(() => expect(createCustomerInquiry).toHaveBeenCalledTimes(1));
    expect(createCustomerInquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Aye Aye',
        contactChannel: 'line',
        contactValue: '@ayeaye',
        serviceType: 'land_cargo',
        route: 'TH-MM',
        weightKg: 2,
        billableWeightKg: 2,
        ratePerKg: 180,
        estimatedCargoFee: 360,
        estimatedTotalThb: 360,
        itemDescription: 'Clothes and snacks',
        notes: 'Need pickup this week',
      })
    );
    expect(createCustomerInquiry.mock.calls[0][0]).not.toHaveProperty('shipmentId');
    expect(createCustomerInquiry.mock.calls[0][0]).not.toHaveProperty('invoiceId');
    expect(screen.getByText(/quote request received/i)).toBeInTheDocument();
  });
});
