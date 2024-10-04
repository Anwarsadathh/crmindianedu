const axios = require("axios");

const sendBulkMessage = async (numbers, message) => {
  const apiUrl = "https://api.interakt.ai/v1/public/message/"; // Interakt API URL
  const apiKey = "b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo="; // Replace with your actual API Key

  try {
    const sendPromises = numbers.map(async (number) => {
      const payload = {
        countryCode: "91", // Country code for India
        phoneNumber: number, // Individual phone number
        type: "Template", // Using a WhatsApp template message
        callbackData: "bulk_send", // Optional callback data
        template: {
          name: "sample_template_test", // Replace with your actual template name
          languageCode: "en", // Language code for the template
          bodyValues: [
            message, // Ensure this matches the expected parameters of the template
          ],
        },
      };

      const headers = {
        // Change to 'Bearer' if required, or ensure Basic Auth is set correctly
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      };

      // Send the POST request to Interakt
      const response = await axios.post(apiUrl, payload, { headers });
      return response.data;
    });

    // Wait for all promises to resolve
    const responses = await Promise.all(sendPromises);
    return responses;
  } catch (error) {
    console.error(
      "Error in sendBulkMessage:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

module.exports = { sendBulkMessage };
