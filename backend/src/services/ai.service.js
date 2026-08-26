import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/env.js';

let genAI = null;
if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('placeholder')) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

/**
 * Generates an executive 3-4 sentence digest for a closed shift.
 */
export const generateShiftDigest = async (shiftData) => {
  if (!genAI) {
    return `Shift ${shiftData.type} closed successfully. Produced ${shiftData.totalProduced || 0} units against target of ${shiftData.totalTarget || 0} with ${shiftData.totalRejected || 0} rejections across active lines.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an AI operations assistant in a smart factory. Summarize the following shift data into a 3-4 sentence concise executive digest for management:
    ${JSON.stringify(shiftData, null, 2)}
    Focus on key KPIs (efficiency %, total output, rejection count, downtime/delay causes if any).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('Gemini Shift Digest Error:', err.message);
    return `Shift ${shiftData.type} summary: Total Produced: ${shiftData.totalProduced || 0}, Total Target: ${shiftData.totalTarget || 0}, Rejected: ${shiftData.totalRejected || 0}. Overall efficiency: ${shiftData.efficiencyPct || 0}%.`;
  }
};

/**
 * Text-to-SQL query generation.
 */
export const generateSqlFromQuery = async (userQuestion, factoryId) => {
  const schemaContext = `
  Database Schema (PostgreSQL):
  - User(id, name, email)
  - Factory(id, name, location)
  - Shift(id, factoryId, type ['MORNING', 'AFTERNOON', 'NIGHT'], status ['ACTIVE', 'COMPLETED'], startTime, endTime)
  - ProductionLine(id, name, factoryId)
  - Production(id, shiftId, lineId, supervisorId, targetUnits, producedUnits, rejectedUnits, delayReason, recordedAt)
  - Defect(id, productionId, count, reason, description, recordedAt)
  - Machine(id, factoryId, name, type, status ['ACTIVE', 'IDLE', 'FAULT', 'MAINTENANCE'], efficiencyPct)
  - MaintenanceLog(id, machineId, reportedBy, faultDescription, downtimeStart, downtimeEnd, maintenanceType)
  - Attendance(id, userId, shiftId, status ['PRESENT', 'ABSENT', 'LATE'], checkIn, checkOut, date)
  - Notification(id, factoryId, type, severity, message, isRead, createdAt)
  `;

  const instructions = `
  You are an expert PostgreSQL DBA. Given a user question, generate ONLY a single valid read-only SELECT SQL query.
  CRITICAL RULES:
  1. ONLY generate SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.
  2. ALWAYS scope queries to factoryId = '${factoryId}' directly or via table joins.
  3. Respond in raw JSON format: { "sql": "SELECT ...", "explanation": "Brief context" }
  `;

  if (!genAI) {
    return {
      sql: `SELECT p.name AS line_name, SUM(pr."producedUnits") AS total_produced FROM "Production" pr JOIN "ProductionLine" p ON pr."lineId" = p.id WHERE p."factoryId" = '${factoryId}' GROUP BY p.name;`,
      explanation: 'Generated standard summary query for line production.',
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `${schemaContext}\n${instructions}\nUser Question: "${userQuestion}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { sql: '', explanation: text };
  } catch (err) {
    console.error('Gemini Text-to-SQL Error:', err.message);
    throw new Error('Failed to generate SQL query from prompt');
  }
};

/**
 * Formats SQL results into plain natural language answer.
 */
export const summarizeQueryResult = async (question, queryUsed, rows) => {
  if (!genAI) {
    return `Query executed successfully. Result contains ${rows.length} records. (${JSON.stringify(rows.slice(0, 3))})`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `The user asked: "${question}".
    The SQL query executed was: "${queryUsed}".
    The resulting rows are: ${JSON.stringify(rows)}
    Provide a clear, 2-3 sentence answer directly addressing the user's question based on the query results.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    return `Found ${rows.length} result(s) for your question.`;
  }
};
