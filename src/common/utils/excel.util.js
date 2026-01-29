import * as ExcelJS from 'exceljs';

export class ExcelUtil {
    static async export(data, columns, sheetName = 'Sheet1') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // Define columns
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 20,
        }));

        // Add data
        data.forEach((item) => {
            const rowData = {};
            columns.forEach(col => {
                const value = item[col.key];
                rowData[col.key] = col.format ? col.format(value) : value;
            });
            worksheet.addRow(rowData);
        });

        // Style Header
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = {
                bold: true,
                size: 12,
                color: { argb: '000000' } // Black text
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF00' } // Yellow background
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        headerRow.height = 25;

        // Style Content
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'left',
                        wrapText: true
                    };
                });
            }
        });

        return await workbook.xlsx.writeBuffer();
    }
}
