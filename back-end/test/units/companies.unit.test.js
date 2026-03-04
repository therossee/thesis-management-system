require('jest');
const { getCompanies } = require('../../src/controllers/companies');
const { Company } = require('../../src/models');

jest.mock('../../src/models', () => ({
  Company: {
    findAll: jest.fn(),
  },
}));

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('getCompanies', () => {
  test('should return list of companies ordered by corporate_name', async () => {
    const mockCompanies = [
      { id: 1, corporate_name: 'Alpha Corp' },
      { id: 2, corporate_name: 'Beta LLC' },
    ];
    Company.findAll.mockResolvedValueOnce(mockCompanies);

    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await getCompanies(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { id: 1, corporateName: 'Alpha Corp' },
      { id: 2, corporateName: 'Beta LLC' },
    ]);
  });

  test('should handle errors and return status 400', async () => {
    const errorMessage = 'Database error';
    Company.findAll.mockRejectedValueOnce(new Error(errorMessage));

    const req = {};
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    await getCompanies(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
  });
});
