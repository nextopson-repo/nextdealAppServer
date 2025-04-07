import express from 'express';

import {
  // addBooking,
  addToCart,
  // removeFromCart,
  // checkout,
  // rescheduleOrderItemBooking,
  // cancelOrderItemBooking,
  getProvidedServicesByCategoryAndSubCategory,
  getDistinctCitiesBySubCategory,
  getAvailableTimeSlots,
  addOrUpdateAddress,
  deleteAddress,
  getAllAddresses,
  fetchCartItem,
  convertCartToOrder,
  cancelOrderItemBooking,
  rescheduleOrder,
  fetchOrderHistory,
  fetchBookingItem,
} from '@/api/controllers/orderManagement/Customer';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

import { getEventServiceProviders, postBookServiceProvider } from '@/api/controllers/event/CreateEventController';
const Router = express.Router();

// Router.post('/add-bookings', addBooking);
Router.post('/providers', getProvidedServicesByCategoryAndSubCategory);
Router.post('/providers/cities', authenticate, getDistinctCitiesBySubCategory);
Router.post('/timeSlots', authenticate, getAvailableTimeSlots);

Router.post('/event/providers', getEventServiceProviders);
Router.post('/event/providers/book', postBookServiceProvider);

Router.post('/order-history', authenticate, fetchOrderHistory);

Router.post('/get-address', authenticate, getAllAddresses);
Router.post('/add-or-update-address', authenticate, addOrUpdateAddress);
Router.post('/delete-address', authenticate, deleteAddress);

Router.post('/add-to-cart', authenticate, addToCart);
Router.post('/get-cart-item', authenticate, fetchCartItem);
Router.post('/get-booked-item', authenticate, fetchBookingItem);
Router.post('/cart-to-order', convertCartToOrder);
Router.post('/reschedule', authenticate, rescheduleOrder);
Router.post('/cancel', authenticate, cancelOrderItemBooking);

// Router.post('/remove-from-cart', removeFromCart);
// Router.post('/checkout', checkout);

export default Router;
