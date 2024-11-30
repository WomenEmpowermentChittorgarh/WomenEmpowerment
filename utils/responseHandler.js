/**
 * A utility function for consistent API responses.
 * @param {string} status - The status of the response ("Success" or "Failure").
 * @param {number} statusCode - The HTTP status code (e.g., 200, 404, 500).
 * @param {string} message - A message describing the response.
 * @param {object|null} payload - Additional data to include in the response (optional).
 * @returns {object} - A standardized response object.
 */
const responseHandler = (status, statusCode, message, payload = null) => {
    return {
        statusCode,
        status,
        message,
        payload,
    };
};

module.exports = responseHandler;
