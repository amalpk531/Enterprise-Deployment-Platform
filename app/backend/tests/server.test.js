const request = require('supertest');
const app = require('../server');

describe('Health Endpoint', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('enterprise-app-backend');
  });
});

describe('Transactions API', () => {
  it('should return an empty transactions list initially', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create, update, and delete a transaction', async () => {
    const createRes = await request(app).post('/api/transactions').send({
      title: 'Salary',
      amount: 2500,
      type: 'income',
      category: 'Work',
      date: '2026-07-07'
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.title).toBe('Salary');

    const id = createRes.body._id || createRes.body.id;

    const updateRes = await request(app).put(`/api/transactions/${id}`).send({
      title: 'Freelance income'
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.title).toBe('Freelance income');

    const deleteRes = await request(app).delete(`/api/transactions/${id}`);
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.deleted).toBe(true);
