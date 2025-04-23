import axios from 'axios';
import { ServiceResponse, ResponseStatus } from '@/common/models/serviceResponse';

// MSG91 Configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = "Nextdeal"
const MSG91_ROUTE = process.env.MSG91_ROUTE || '4'; // Default route for transactional SMS

if (!MSG91_AUTH_KEY || !MSG91_SENDER_ID) {
  throw new Error('MSG91 credentials are not properly configured');
}

export const sendMobileOTP = async (mobileNumber: string, otp: string): Promise<ServiceResponse> => {
  try {
    // Format mobile number (remove any non-digit characters)
    const formattedNumber = mobileNumber.replace(/\D/g, '');

    // MSG91 API endpoint
    const url = 'https://api.msg91.com/api/v5/flow/';

    // Prepare the request payload
    const payload = {
      flow_id: process.env.MSG91_FLOW_ID, // Your MSG91 flow ID for OTP
      sender: MSG91_SENDER_ID,
      mobiles: `91${formattedNumber}`, // MSG91 requires country code
      otp: otp,
    };

    // Make the API request
    const response = await axios.post(url, payload, {
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.type === 'success') {
      return new ServiceResponse(
        ResponseStatus.Success,
        'OTP sent successfully',
        null,
        200
      );
    } else {
      throw new Error(response.data.message || 'Failed to send OTP');
    }
  } catch (error) {
    console.error('Error sending mobile OTP:', error);
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Failed to send OTP',
      null,
      500
    );
  }
}; 