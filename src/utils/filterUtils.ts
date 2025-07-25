import { TableColumnInfo } from '../types/database';

/**
 * Convert filter value to appropriate type based on column data type
 */
export function convertFilterValue(
  value: string,
  columnName: string,
  columnInfos?: TableColumnInfo[]
): any {
  if (!value || !columnInfos) {
    return value;
  }

  const columnInfo = columnInfos.find(col => col.column_name === columnName);
  if (!columnInfo) {
    return value;
  }

  const dataType = columnInfo.data_type.toLowerCase();

  try {
    // 数字类型
    if (isNumericType(dataType)) {
      // 处理整数类型
      if (isIntegerType(dataType)) {
        const intValue = parseInt(value, 10);
        if (isNaN(intValue)) {
          throw new Error(`Invalid integer value: ${value}`);
        }
        return intValue;
      }

      // 处理浮点数类型
      const floatValue = parseFloat(value);
      if (isNaN(floatValue)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }
      return floatValue;
    }

    // 布尔类型
    if (isBooleanType(dataType)) {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
        return true;
      } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
        return false;
      } else {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    }

    // 日期时间类型
    // if (isDateTimeType(dataType)) {
    //   // 对于日期时间类型，我们进行基本验证但保持字符串格式
    //   // 这样可以支持各种日期格式，让PostgreSQL来处理解析
    //   if (!value.trim()) {
    //     throw new Error(`Date value cannot be empty`);
    //   }

    //   // 简单的日期格式验证
    //   const dateFormats = [
    //     /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    //     /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
    //     /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format
    //     /^\d{2}:\d{2}:\d{2}$/, // HH:MM:SS (time only)
    //     /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/, // with microseconds
    //   ];

    //   const isValidFormat = dateFormats.some(format => format.test(value));
    //   if (!isValidFormat) {
    //     // 尝试用Date构造函数验证
    //     const dateValue = new Date(value);
    //     if (isNaN(dateValue.getTime())) {
    //       throw new Error(`Invalid date/time format: ${value}`);
    //     }
    //   }

    //   return value; // 保持字符串格式，让数据库处理
    // }

    // 默认返回字符串
    return value;
  } catch (error) {
    // 如果转换失败，返回原始字符串值
    console.warn(`Failed to convert filter value "${value}" for column "${columnName}":`, error);
    return value;
  }
}

/**
 * Check if data type is numeric
 */
function isNumericType(dataType: string): boolean {
  const numericTypes = [
    'numeric',
    'integer',
    'bigint',
    'smallint',
    'decimal',
    'real',
    'double precision',
    'money',
    'serial',
    'bigserial',
    'int',
    'int2',
    'int4',
    'int8',
    'float4',
    'float8',
  ];

  return numericTypes.some(type => dataType.includes(type));
}

/**
 * Check if data type is integer
 */
function isIntegerType(dataType: string): boolean {
  const integerTypes = [
    'integer',
    'bigint',
    'smallint',
    'serial',
    'bigserial',
    'int',
    'int2',
    'int4',
    'int8',
  ];

  return integerTypes.some(type => dataType.includes(type));
}

/**
 * Check if data type is boolean
 */
function isBooleanType(dataType: string): boolean {
  return dataType.includes('boolean') || dataType.includes('bool');
}

/**
 * Check if data type is date/time
 */
function isDateTimeType(dataType: string): boolean {
  const dateTimeTypes = ['date', 'time', 'timestamp', 'interval'];

  return dateTimeTypes.some(type => dataType.includes(type));
}

/**
 * Validate filter value for given column type
 */
export function validateFilterValue(
  value: string,
  columnName: string,
  columnInfos?: TableColumnInfo[]
): { isValid: boolean; errorMessage?: string } {
  if (!value || !columnInfos) {
    return { isValid: true };
  }

  const columnInfo = columnInfos.find(col => col.column_name === columnName);
  if (!columnInfo) {
    return { isValid: true };
  }

  const dataType = columnInfo.data_type.toLowerCase();

  try {
    // 数字类型验证
    if (isNumericType(dataType)) {
      if (isIntegerType(dataType)) {
        const intValue = parseInt(value, 10);
        if (isNaN(intValue)) {
          return { isValid: false, errorMessage: 'Please enter a valid integer' };
        }
      } else {
        const floatValue = parseFloat(value);
        if (isNaN(floatValue)) {
          return { isValid: false, errorMessage: 'Please enter a valid number' };
        }
      }
    }

    // 布尔类型验证
    if (isBooleanType(dataType)) {
      const lowerValue = value.toLowerCase();
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!validBooleans.includes(lowerValue)) {
        return { isValid: false, errorMessage: 'Please enter true/false, 1/0, or yes/no' };
      }
    }

    // 日期时间类型验证
    if (isDateTimeType(dataType)) {
      if (!value.trim()) {
        return { isValid: false, errorMessage: 'Date value cannot be empty' };
      }

      // 简单的日期格式验证
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format
        /^\d{2}:\d{2}:\d{2}$/, // HH:MM:SS (time only)
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/, // with microseconds
      ];

      const isValidFormat = dateFormats.some(format => format.test(value));
      if (!isValidFormat) {
        // 尝试用Date构造函数验证
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            isValid: false,
            errorMessage:
              'Please enter a valid date/time format (e.g., 2023-12-25, 2023-12-25 14:30:00)',
          };
        }
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, errorMessage: 'Invalid value format' };
  }
}
