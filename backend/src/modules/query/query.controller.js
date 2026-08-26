import * as queryService from './query.service.js';

export const askQuestion = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    const result = await queryService.processNaturalLanguageQuery(question, req.factoryId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
