const axios = require("axios");

const sendBulkMessage = async (numbers, message) => {
  try {
    const apiUrl = "https://api.interakt.ai/v1/public/message/"; // Interakt API URL
    const apiKey =
      "b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo="; // Replace with your actual API Key from Interakt

    // Format the numbers to include the country code if necessary
    const formattedNumbers = numbers.map((number) => `${number}`);

    // Prepare the payload
    const payload = {
      countryCode: "91", // Replace with your country code (without "+")
      phoneNumber: formattedNumbers.join(","), // Comma-separated list of mobile numbers
      type: "Template",
      template: {
        name: "your_correct_template_code", // Replace with the exact template code from Interakt
        languageCode: "en", // Replace with the template's language code
        headerValues: ["Header Value"], // Replace with actual header values
        bodyValues: [message], // Dynamic message body
        buttonValues: {}, // If there are buttons, provide their values here
      },
      callbackData: "custom_data", // Optional additional data
    };

    // Set up headers
    const headers = {
      Authorization: `Basic ${apiKey}`, // Replace with actual authentication header
      "Content-Type": "application/json",
    };

    // Send the POST request to Interakt
    const response = await axios.post(apiUrl, payload, { headers });

    // Check the response
    if (response.data.success) {
      console.log("Messages sent successfully:", response.data);
      return response.data;
    } else {
      console.error("Failed to send messages:", response.data);
      throw new Error(response.data.message || "Failed to send messages");
    }
  } catch (error) {
    console.error("Error in sendBulkMessage:", error);
    throw error;
  }
};

module.exports = { sendBulkMessage };
