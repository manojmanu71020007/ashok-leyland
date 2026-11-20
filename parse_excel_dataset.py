import sys
import json
import re
from pathlib import Path

def parse_excel_dataset(file_path):
    import openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True)
    results = []
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            continue
            
        # Find header row
        header_idx = -1
        reg_col = -1
        cat_col = -1
        bm_col = -1
        depot_col = -1
        
        for r_idx, row in enumerate(rows[:10]):
            if not row:
                continue
            cells = [str(c).strip().lower() if c is not None else "" for c in row]
            for c_idx, cell in enumerate(cells):
                clean = re.sub(r'[^a-z0-9]', '', cell)
                if re.search(r'reg(no|number|num)?|registration(number|no)?|busreg', clean):
                    reg_col = c_idx
                elif re.search(r'cat(egory)?', clean):
                    cat_col = c_idx
                elif re.search(r'^bm(no|number)?$|^busno$', clean):
                    bm_col = c_idx
                elif re.search(r'depot', clean):
                    depot_col = c_idx
            if reg_col >= 0 or bm_col >= 0:
                header_idx = r_idx
                break
                
        if header_idx >= 0 and (reg_col >= 0 or bm_col >= 0):
            for row in rows[header_idx + 1:]:
                if not row or not any(row):
                    continue
                reg_no = str(row[reg_col]).strip().upper() if reg_col >= 0 and row[reg_col] is not None else ""
                bm = str(row[bm_col]).strip().upper() if bm_col >= 0 and row[bm_col] is not None else ""
                
                if not reg_no and not bm:
                    continue
                # Skip duplicate header rows inside data
                clean_bm = re.sub(r'[^A-Z0-9]', '', bm)
                clean_reg = re.sub(r'[^A-Z0-9]', '', reg_no)
                if clean_bm in ["BMNO", "BUSNO", "VEHICLEID", "SLNO"] or clean_reg in ["REGNO", "REGISTRATIONNO", "BUSREG"]:
                    continue
                    
                cat_val = str(row[cat_col]).strip().upper() if cat_col >= 0 and row[cat_col] is not None else "B"
                category = "B"
                clean_cat = re.sub(r'^CAT(EGORY)?\s*[:\-_]?\s*', '', cat_val, flags=re.IGNORECASE).strip()
                if clean_cat.startswith("A") or "CAT A" in cat_val:
                    category = "A"
                elif clean_cat.startswith("B") or "CAT B" in cat_val:
                    category = "B"
                elif clean_cat.startswith("C") or "CAT C" in cat_val:
                    category = "C"
                    
                depot_val = str(row[depot_col]).strip() if depot_col >= 0 and row[depot_col] is not None else ""
                
                results.append({
                    "bm": bm,
                    "regNo": reg_no,
                    "category": category,
                    "depot": depot_val,
                    "sheet": sheet_name
                })
            if results:
                break
                
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = parse_excel_dataset(sys.argv[1])
        print(json.dumps(data))
    else:
        print(json.dumps([]))
