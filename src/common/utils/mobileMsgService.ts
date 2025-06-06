import axios from 'axios';
import { ServiceResponse, ResponseStatus } from '@/common/models/serviceResponse';
import https from 'https';

// DVHosting Configuration
const DVHOSTING_API_KEY = process.env.DVHOSTING_API_KEY;

if (!DVHOSTING_API_KEY) {
  throw new Error('DVHosting API key is not properly configured');
}

export const sendMobileOTP = async (mobileNumber: string, otp: string): Promise<ServiceResponse> => {
  try {
    // Format mobile number (remove any non-digit characters)
    const formattedNumber = mobileNumber.replace(/\D/g, '');
    
    // Ensure mobile number is 10 digits
    if (formattedNumber.length !== 10) {
      throw new Error('Invalid mobile number format. Must be 10 digits.');
    }

    // DVHosting API endpoint
    const url = `https://dvhosting.in/api-sms-v3.php?api_key=${DVHOSTING_API_KEY}&number=${formattedNumber}&otp=${otp}`;
    
    console.log('Sending OTP to:', formattedNumber);
    console.log('Using URL:', url);

    // Make the API request
    const response = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    console.log('DVHosting API Response:', response.data);

    // Check if the response indicates success
    if (response.data && response.data.return === true && response.data.message && 
        (Array.isArray(response.data.message) ? 
         response.data.message[0].toLowerCase().includes('success') : 
         response.data.message.toLowerCase().includes('success'))) {
      return new ServiceResponse(
        ResponseStatus.Success,
        'OTP sent successfully',
        null,
        200
      );
    } else {
      const errorMessage = response.data?.message?.[0] || response.data?.message || 'Failed to send OTP';
      console.error('DVHosting API Error:', errorMessage);
      return new ServiceResponse(
        ResponseStatus.Failed,
        errorMessage,
        null,
        500
      );
    }
  } catch (error) {
    console.error('Error sending mobile OTP:', error);
    return new ServiceResponse(
      ResponseStatus.Failed,
      error instanceof Error ? error.message : 'Failed to send OTP',
      null,
      500
    );
  }
}; 