import { useSettingsStore } from '../stores/settingsStore';
import { OpenAIConfig } from '../types/config';

/**
 * AIService provides AI-powered features for database operations
 * Uses OpenAI-compatible APIs for natural language to SQL conversion
 * Integrates with the settings store for configuration
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable?: boolean;
    primary_key?: boolean;
  }[];
}

class AIService {
  private getConfig(): OpenAIConfig {
    return useSettingsStore.getState().getOpenAIConfig();
  }

  private async makeOpenAIRequest(messages: ChatMessage[]): Promise<string> {
    const config = this.getConfig();

    if (!config.apiKey) {
      throw new Error('OpenAI API key is not configured. Please check your settings.');
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.1, // Low temperature for more consistent SQL generation
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Convert natural language query to SQL
   * @param naturalLanguageQuery The user's natural language query
   * @param tableSchemas Array of table schemas for context
   * @param databaseType Type of database (postgresql, mysql, sqlite, etc.)
   */
  async convertToSQL(
    naturalLanguageQuery: string,
    tableSchemas: TableSchema[],
    databaseType: string = 'postgresql'
  ): Promise<string> {
    const schemaContext = tableSchemas
      .map(table => {
        const columns = table.columns
          .map(col => {
            let colDef = `${col.name} ${col.type}`;
            if (col.primary_key) colDef += ' PRIMARY KEY';
            if (!col.nullable) colDef += ' NOT NULL';
            return colDef;
          })
          .join(', ');
        return `Table: ${table.name}\nColumns: ${columns}`;
      })
      .join('\n\n');

    const systemPrompt = `You are a SQL expert. Convert natural language queries to ${databaseType} SQL statements.

Database Schema:
${schemaContext}

Rules:
1. Return ONLY the SQL query, no explanations or markdown formatting
2. Use proper ${databaseType} syntax
3. Be EXTREMELY careful with table and column names - respect exact case sensitivity
4. Use double quotes around table/column names that contain uppercase letters or special characters
5. Use appropriate JOINs when needed
6. Include proper WHERE clauses for filtering
7. Use LIMIT for result limiting when appropriate
8. Handle case-insensitive searches with ILIKE (PostgreSQL) or LIKE with LOWER()

IMPORTANT: Pay special attention to case sensitivity in table and column names. If a table is named "User" (with uppercase U), you MUST use "User" with quotes, not "user".

Examples:
Input: "Show me all users"
Output: SELECT * FROM "User";

Input: "Show me all users with email containing gmail"
Output: SELECT * FROM "User" WHERE email ILIKE '%gmail%';

Input: "Get user names and their order counts"
Output: SELECT u.name, COUNT(o.id) as order_count FROM "User" u LEFT JOIN "Order" o ON u.id = o.user_id GROUP BY u.id, u.name;`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: naturalLanguageQuery },
    ];

    const response = await this.makeOpenAIRequest(messages);

    // Clean up the response - remove any markdown formatting or extra text
    let sqlQuery = response.trim();

    // Remove markdown code blocks if present
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '');

    // Remove any leading/trailing whitespace and ensure it ends with semicolon
    sqlQuery = sqlQuery.trim();
    if (!sqlQuery.endsWith(';')) {
      sqlQuery += ';';
    }

    return sqlQuery;
  }

  /**
   * Explain a SQL query in natural language
   * @param sqlQuery The SQL query to explain
   */
  async explainSQL(sqlQuery: string): Promise<string> {
    const systemPrompt = `You are a SQL expert. Explain SQL queries in clear, simple language that non-technical users can understand.

Rules:
1. Break down the query step by step
2. Explain what data is being retrieved
3. Explain any filtering, sorting, or grouping
4. Use simple, non-technical language
5. Be concise but comprehensive`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Explain this SQL query: ${sqlQuery}` },
    ];

    return await this.makeOpenAIRequest(messages);
  }

  /**
   * Optimize a SQL query
   * @param sqlQuery The SQL query to optimize
   * @param tableSchemas Array of table schemas for context
   */
  async optimizeSQL(
    sqlQuery: string,
    tableSchemas: TableSchema[]
  ): Promise<{ optimizedQuery: string; explanation: string }> {
    const schemaContext = tableSchemas
      .map(table => {
        const columns = table.columns
          .map(col => {
            let colDef = `${col.name} ${col.type}`;
            if (col.primary_key) colDef += ' PRIMARY KEY';
            if (!col.nullable) colDef += ' NOT NULL';
            return colDef;
          })
          .join(', ');
        return `Table: ${table.name}\nColumns: ${columns}`;
      })
      .join('\n\n');

    const systemPrompt = `You are a SQL optimization expert. Analyze the given SQL query and provide an optimized version along with explanations.

Database Schema:
${schemaContext}

Provide your response in this exact format:
OPTIMIZED_QUERY:
[optimized SQL query here]

EXPLANATION:
[explanation of optimizations made]

Optimization techniques to consider:
1. Use appropriate indexes
2. Avoid SELECT *
3. Use proper JOINs instead of subqueries when possible
4. Add LIMIT when appropriate
5. Use EXISTS instead of IN for subqueries
6. Optimize WHERE clauses`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sqlQuery },
    ];

    const response = await this.makeOpenAIRequest(messages);

    // Parse the response to extract optimized query and explanation
    const optimizedMatch = response.match(/OPTIMIZED_QUERY:\s*([\s\S]*?)\s*EXPLANATION:/i);
    const explanationMatch = response.match(/EXPLANATION:\s*([\s\S]*?)$/i);

    let optimizedQuery = optimizedMatch ? optimizedMatch[1].trim() : sqlQuery;
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : 'No optimization suggestions available.';

    // Clean up the optimized query
    optimizedQuery = optimizedQuery
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    if (!optimizedQuery.endsWith(';')) {
      optimizedQuery += ';';
    }

    return {
      optimizedQuery,
      explanation,
    };
  }

  /**
   * Generate sample data for a table
   * @param tableName Name of the table
   * @param columns Array of column definitions
   * @param rowCount Number of sample rows to generate
   */
  async generateSampleData(
    tableName: string,
    columns: { name: string; type: string; nullable?: boolean }[],
    rowCount: number = 5
  ): Promise<string> {
    const columnDefs = columns.map(col => `${col.name} (${col.type})`).join(', ');

    const systemPrompt = `Generate realistic sample data for a database table.

Table: ${tableName}
Columns: ${columnDefs}

Rules:
1. Generate exactly ${rowCount} INSERT statements
2. Use realistic, diverse sample data
3. Respect data types and constraints
4. Use proper SQL syntax
5. Return only the INSERT statements, no explanations`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${rowCount} sample rows for the ${tableName} table` },
    ];

    const response = await this.makeOpenAIRequest(messages);

    // Clean up the response
    return response
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  /**
   * Check if AI service is properly configured
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    console.log(config);
    return !!(config.apiKey && config.baseUrl && config.model);
  }

  /**
   * Test the AI service connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'AI service is not properly configured. Please check your settings.',
        };
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Reply with just "OK" to test the connection.' },
      ];

      const response = await this.makeOpenAIRequest(messages);

      return {
        success: true,
        message: `Connection successful. Response: ${response.trim()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
