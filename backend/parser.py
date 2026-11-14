import io
import math
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


def detect_file_type(filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    if ext in ['xlsx', 'xlsm', 'xltx', 'xltm']:
        return 'excel'
    elif ext == 'xls':
        return 'excel_legacy'
    elif ext in ['csv', 'tsv', 'txt']:
        return 'csv'
    elif ext == 'json':
        return 'json'
    return 'unknown'


class DocumentParser:
    def __init__(self):
        self.current_df: Optional[pd.DataFrame] = None
        self.filename: str = ""
        self.file_type: str = ""
        self.sheet_names: List[str] = []
        self.active_sheet: Optional[str] = None
        self._raw_bytes: Optional[bytes] = None

    def load_bytes(self, content: bytes, filename: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        self._raw_bytes = content
        self.filename = filename
        self.file_type = detect_file_type(filename)
        buffer = io.BytesIO(content)

        if self.file_type in ['excel', 'excel_legacy']:
            excel_file = pd.ExcelFile(buffer)
            self.sheet_names = excel_file.sheet_names
            target_sheet = sheet_name if sheet_name and sheet_name in self.sheet_names else self.sheet_names[0]
            self.active_sheet = target_sheet
            self.current_df = pd.read_excel(excel_file, sheet_name=target_sheet)
        elif self.file_type == 'json':
            self.sheet_names = ["Default"]
            self.active_sheet = "Default"
            self.current_df = pd.read_json(buffer)
        else:  # CSV / TSV
            self.sheet_names = ["Default"]
            self.active_sheet = "Default"
            # Try comma, then tab, then semicolon
            for sep in [',', '\t', ';', '|']:
                buffer.seek(0)
                try:
                    df = pd.read_csv(buffer, sep=sep, low_memory=False)
                    if len(df.columns) > 1 or sep == ',':
                        self.current_df = df
                        break
                except Exception:
                    continue
            if self.current_df is None:
                buffer.seek(0)
                self.current_df = pd.read_csv(buffer, low_memory=False)

        # Standardize DataFrame
        self._clean_dataframe()
        return self.get_profile()

    def switch_sheet(self, sheet_name: str) -> Dict[str, Any]:
        if not self._raw_bytes or self.file_type not in ['excel', 'excel_legacy']:
            raise ValueError("No Excel workbook loaded to switch sheets.")
        if sheet_name not in self.sheet_names:
            raise ValueError(f"Sheet '{sheet_name}' not found. Available sheets: {self.sheet_names}")
        
        buffer = io.BytesIO(self._raw_bytes)
        excel_file = pd.ExcelFile(buffer)
        self.active_sheet = sheet_name
        self.current_df = pd.read_excel(excel_file, sheet_name=sheet_name)
        self._clean_dataframe()
        return self.get_profile()

    def _clean_dataframe(self):
        if self.current_df is None:
            return
        # Ensure column names are strings and trimmed
        self.current_df.columns = [str(c).strip() for c in self.current_df.columns]
        # Replace inf and -inf with NaN for safety
        self.current_df.replace([np.inf, -np.inf], np.nan, inplace=True)

    def get_profile(self) -> Dict[str, Any]:
        if self.current_df is None:
            return {"error": "No document loaded"}

        df = self.current_df
        total_rows = int(len(df))
        total_cols = int(len(df.columns))
        memory_usage_bytes = int(df.memory_usage(deep=True).sum())
        missing_cells = int(df.isna().sum().sum())
        total_cells = total_rows * total_cols if total_cols > 0 else 1
        missing_pct = round((missing_cells / total_cells) * 100, 2)
        duplicate_rows = int(df.duplicated().sum())

        columns_profile = []
        for col in df.columns:
            series = df[col]
            null_count = int(series.isna().sum())
            null_pct = round((null_count / total_rows * 100), 2) if total_rows > 0 else 0
            unique_count = int(series.nunique(dropna=True))

            # Determine simplified high-level data type
            if pd.api.types.is_numeric_dtype(series):
                col_type = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(series):
                col_type = "datetime"
            elif pd.api.types.is_bool_dtype(series):
                col_type = "boolean"
            elif unique_count <= 25 and total_rows > 10:
                col_type = "category"
            else:
                col_type = "text"

            col_meta: Dict[str, Any] = {
                "name": col,
                "type": col_type,
                "null_count": null_count,
                "null_pct": null_pct,
                "unique_count": unique_count,
            }

            # Add distribution or summary stats
            non_null_series = series.dropna()
            if col_type == "numeric" and not non_null_series.empty:
                col_meta["min"] = float(non_null_series.min()) if not math.isnan(float(non_null_series.min())) else None
                col_meta["max"] = float(non_null_series.max()) if not math.isnan(float(non_null_series.max())) else None
                col_meta["mean"] = round(float(non_null_series.mean()), 2)
                col_meta["median"] = round(float(non_null_series.median()), 2)

            # Top value distributions for categorical or text with low cardinality
            if unique_count <= 50 and not non_null_series.empty:
                top_counts = non_null_series.astype(str).value_counts().head(10).to_dict()
                col_meta["distribution"] = [{"value": k, "count": int(v)} for k, v in top_counts.items()]
            else:
                samples = non_null_series.head(5).astype(str).tolist()
                col_meta["sample_values"] = samples

            columns_profile.append(col_meta)

        return {
            "filename": self.filename,
            "file_type": self.file_type,
            "sheets": self.sheet_names,
            "active_sheet": self.active_sheet,
            "overview": {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "memory_usage_kb": round(memory_usage_bytes / 1024, 1),
                "missing_cells": missing_cells,
                "missing_pct": missing_pct,
                "duplicate_rows": duplicate_rows
            },
            "columns": columns_profile
        }
