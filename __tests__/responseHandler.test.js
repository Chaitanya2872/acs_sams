const {
  sendSuccessResponse,
  sendErrorResponse,
  sendPaginatedResponse
} = require('../src/utils/responseHandler');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('responseHandler', () => {
  test('sendSuccessResponse returns a success payload with custom status', () => {
    const res = createResponseMock();
    const payload = { id: 'abc123' };

    sendSuccessResponse(res, 'Saved successfully', payload, 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Saved successfully',
      data: payload
    });
  });

  test('sendErrorResponse preserves backward compatibility for the old argument order', () => {
    const res = createResponseMock();

    sendErrorResponse(res, 422, 'Validation failed', { field: 'email' });

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed'
    });
  });

  test('sendPaginatedResponse computes pagination metadata correctly', () => {
    const res = createResponseMock();
    const data = [{ id: 1 }, { id: 2 }];

    sendPaginatedResponse(res, data, 2, 2, 5, 'Fetched');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Fetched',
      data,
      pagination: {
        currentPage: 2,
        totalPages: 3,
        totalItems: 5,
        itemsPerPage: 2,
        hasNextPage: true,
        hasPrevPage: true,
        nextPage: 3,
        prevPage: 1
      }
    });
  });
});
