// Excel Data Loader for B/L Search
// Loads and parses the Excel file, mapping columns to BLRecord interface

import * as XLSX from 'xlsx';
import { BLRecord, setBLData } from './blMockData';

interface ExcelRow {
  Date?: string | number;
  'Import Country'?: string;
  Importer?: string;
  'Importer Address'?: string;
  Exporter?: string;
  'Exporter Address'?: string;
  'HS Code'?: string | number;
  Product?: string;
  Quantity?: string | number;
  'Qty Unit'?: string;
  Weight?: string | number;
  'Wgt Unit'?: string;
  'Value (US$)'?: string | number;
  'Country of Origin'?: string;
  'Country of Destination'?: string;
  'Country of Transit'?: string;
  'Port of Loading'?: string;
  'Port of Discharge'?: string;
  Incoterms?: string;
}

// Parse Excel date serial number to string
function parseExcelDate(value: string | number | undefined): string {
  if (!value) return '-';
  
  if (typeof value === 'number') {
    // Excel date serial number
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value);
  }
  
  return String(value);
}

// Format value with fallback
function formatValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value).trim();
}

// Format quantity with unit
function formatQuantityWithUnit(quantity: string | number | undefined, unit: string | undefined): string {
  const qty = formatValue(quantity);
  const qtyUnit = formatValue(unit);
  
  if (qty === '-') return '-';
  if (qtyUnit === '-') return qty;
  
  return `${qty} ${qtyUnit}`;
}

// Format weight with unit
function formatWeightWithUnit(weight: string | number | undefined, unit: string | undefined): string {
  const wgt = formatValue(weight);
  const wgtUnit = formatValue(unit);
  
  if (wgt === '-') return '-';
  if (wgtUnit === '-') return wgt;
  
  return `${wgt} ${wgtUnit}`;
}

// Parse USD value
function parseUSDValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  
  if (typeof value === 'number') return value;
  
  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

// Transform Excel row to BLRecord
function transformRow(row: ExcelRow, index: number): BLRecord {
  return {
    id: String(index + 1),
    date: parseExcelDate(row.Date),
    importer: formatValue(row.Importer),
    exporter: formatValue(row.Exporter),
    hsCode: formatValue(row['HS Code']),
    productName: formatValue(row.Product),
    quantity: formatQuantityWithUnit(row.Quantity, row['Qty Unit']),
    weight: formatWeightWithUnit(row.Weight, row['Wgt Unit']),
    valueUSD: parseUSDValue(row['Value (US$)']),
    originCountry: formatValue(row['Country of Origin']),
    destinationCountry: formatValue(row['Country of Destination']),
    // Additional fields for detail view
    importerAddress: formatValue(row['Importer Address']),
    exporterAddress: formatValue(row['Exporter Address']),
    transitCountry: formatValue(row['Country of Transit']),
    portOfLoading: formatValue(row['Port of Loading']),
    portOfDischarge: formatValue(row['Port of Discharge']),
    incoterms: formatValue(row.Incoterms),
    importCountry: formatValue(row['Import Country']),
  };
}

// Load Excel file and populate BL data
export async function loadBLDataFromExcel(): Promise<BLRecord[]> {
  try {
    const response = await fetch('/data/bl-data.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Transform rows to BLRecord format
    const records = rawData.map((row, index) => transformRow(row, index));
    
    // Set the data globally
    setBLData(records);
    
    console.log(`Loaded ${records.length} B/L records from Excel`);
    
    return records;
  } catch (error) {
    console.error('Error loading Excel file:', error);
    return [];
  }
}

// Check if data is loaded
export function isBLDataLoaded(): boolean {
  // Import mockBLData here to avoid circular dependency issues
  const { mockBLData } = require('./blMockData');
  return mockBLData.length > 0;
}
