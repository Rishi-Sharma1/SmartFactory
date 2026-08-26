import prisma from '../../config/db.js';
import * as aiService from '../../services/ai.service.js';

export const processNaturalLanguageQuery = async (question, factoryId) => {
  const { sql, explanation } = await aiService.generateSqlFromQuery(question, factoryId);

  if (!sql) {
    return {
      answer: explanation || 'Could not interpret question into a valid query.',
      queryUsed: null,
    };
  }

  const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
  const uppercaseSql = sql.toUpperCase();
  for (const kw of forbiddenKeywords) {
    if (uppercaseSql.includes(kw)) {
      throw { statusCode: 400, message: `Security violation: non-read query '${kw}' detected` };
    }
  }

  let rows = [];
  try {
    rows = await prisma.$queryRawUnsafe(sql);
  } catch (err) {
    console.error('SQL Execution Error:', err.message);
    return {
      answer: `Executed query but encountered an error: ${err.message}`,
      queryUsed: sql,
    };
  }

  const answer = await aiService.summarizeQueryResult(question, sql, rows);

  return {
    question,
    answer,
    queryUsed: sql,
    explanation,
    rowCount: rows.length,
    resultsPreview: rows.slice(0, 5),
  };
};
