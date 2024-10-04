const axios = require("axios");

const sendBulkMessage = async (numbers, message) => {
  const apiUrl = "https://api.interakt.ai/v1/public/message/"; // Interakt API URL
  const apiKey = "b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo="; // Replace with your actual API Key

  try {
    const sendPromises = numbers.map(async (number) => {
      const payload = {
        countryCode: "91", // Country code
        phoneNumber: number, // Individual phone number
        type: "Text", // Trying to send a text message
        data: { message: message }, // Message content
        callbackData: "bulk_send", // Optional callback data
      };

      const headers = {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      };

      try {
        // Send the POST request to Interakt for a free-form message
        const response = await axios.post(apiUrl, payload, { headers });
        return response.data;
      } catch (error) {
        if (
          error.response &&
          error.response.status === 400 &&
          error.response.data.message.includes("within last 24 hours")
        ) {
          // If the customer hasn't interacted within the last 24 hours, send a template message instead
          console.log(
            `24-hour window expired for ${number}, sending template message.`
          );

          const templatePayload = {
            countryCode: "91", // Country code
            phoneNumber: number, // Individual phone number
            type: "Template", // Using a WhatsApp template message
            template: {
              name: "your_template_name", // Replace with your actual template name
              languageCode: "en", // Language code for the template
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: "Your custom message content here" },
                  ],
                },
              ],
            },
            callbackData: "bulk_send", // Optional callback data
          };

          // Send the template message as a fallback
          const templateResponse = await axios.post(apiUrl, templatePayload, {
            headers,
          });
          return templateResponse.data;
        } else {
          // If it's a different error, throw it
          throw error;
        }
      }
    });

    // Wait for all promises to resolve
    const responses = await Promise.all(sendPromises);
    return responses;
  } catch (error) {
    console.error("Error in sendBulkMessage:", error);
    throw error;
  }
};

module.exports = { sendBulkMessage };
