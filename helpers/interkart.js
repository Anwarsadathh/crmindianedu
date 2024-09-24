const axios = require("axios");

const sendBulkMessage = async (numbers, message) => {
  try {
    const apiUrl = "https://api.intekart.com/sendMessage"; // Example URL, replace with actual
    const apiKey =
      "b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo="; // Use your actual API key from Intekart

    // Format the numbers to include the country code if necessary
    const formattedNumbers = numbers.map((number) => `91${number}`);

    // Prepare the payload
    const payload = {
      numbers: formattedNumbers, // List of mobile numbers
      message: message, // The message to send
      apiKey: apiKey, // API key or authentication
    };

    // Send the POST request to Intekart
    const response = await axios.post(apiUrl, payload);

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
