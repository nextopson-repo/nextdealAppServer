import { createOrUpdateEvent } from '@/api/controllers/events/createEventController';
import {
  createBoughtTicket,
  createEvents,
  deleteUserEvent,
  eventByDetails,
  eventDetailsOptions,
  getBoughtTicket,
  getEventDetails,
  getNearEvent,
  getPopularEvents,
  getUserEvent,
  searchEventsWithFilters,
  eventAndBookedEventFilter,
} from '@/api/controllers/events/eventController';
import { deleteTicket, getTicket, getTicketList, updateTicket } from '@/api/controllers/events/ticketController';
import express from 'express';

const Router = express.Router();

// ticket
Router.post('/update-ticket', updateTicket);
Router.post('/get-ticket-list', getTicketList); // on event Id
Router.post('/get-ticket', getTicket); //on ticket id
Router.post('/delete-ticket', deleteTicket); // on ticket id
Router.post('/event-summary', getEventDetails);

// Event
Router.post('/create-event', createOrUpdateEvent);
Router.post('/get-near-events', getNearEvent);
Router.post('/event-details', eventByDetails);
Router.post('/get-master-data', eventDetailsOptions);
Router.post('/get-popular-events', getPopularEvents);
Router.post('/get-user-event', getUserEvent);
Router.post('/delete-event', deleteUserEvent);
Router.post('/search-n-filter', searchEventsWithFilters);
// Router.post('/filter-event-and-event-booking', eventAndBookedEventFilter);

// EVENT BOOKING
Router.post('/bought-ticket-summery', getBoughtTicket);
Router.post('/create-ticket-summery', createBoughtTicket);

export default Router;
