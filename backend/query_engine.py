import io
from typing import Dict, Any, List, Optional, Union
import pandas as pd
import numpy as np


class QueryEngine:
    def __init__(self, df: pd.DataFrame):
        self.original_df = df

    def query(
        self,
        global_search: Optional[str] = None,
        column_filters: Optional[List[Dict[str, Any]]] = None,
        sort_by: Optional[str] = None,
        sort_asc: bool = True,
        page: int = 1,
        page_size: int = 25,
        target_columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        df = self.original_df

        # 1. Column Selection / Visibility
        if target_columns and len(target_columns) > 0:
            valid_cols = [c for c in target_columns if c in df.columns]
            if valid_cols:
                df = df[valid_cols]

        # 2. Global Search across all columns
        if global_search and global_search.strip():
            term = global_search.strip()
            # Vectorized search across all string representations
            mask = pd.Series(False, index=df.index)
            for col in df.columns:
                col_str = df[col].astype(str)
                mask |= col_str.str.contains(term, case=False, na=False, regex=False)
            df = df[mask]

        # 3. Column-Specific Filters
        if column_filters:
            for f in column_filters:
                col = f.get("column")
                operator = f.get("operator", "contains")
                val = f.get("value")

                if col not in df.columns or val is None or val == "":
                    continue

                series = df[col]

                if operator == "contains":
                    df = df[series.astype(str).str.contains(str(val), case=False, na=False, regex=False)]
                elif operator == "exact" or operator == "equals":
                    # Try numeric matching first if applicable
                    if pd.api.types.is_numeric_dtype(series):
                        try:
                            num_val = float(val)
                            df = df[series == num_val]
                        except ValueError:
                            df = df[series.astype(str).str.lower() == str(val).lower()]
                    else:
                        df = df[series.astype(str).str.lower() == str(val).lower()]
                elif operator == "starts_with":
                    df = df[series.astype(str).str.startswith(str(val), na=False)]
                elif operator == "ends_with":
                    df = df[series.astype(str).str.endswith(str(val), na=False)]
                elif operator == "in":
                    # Multi-select list of values
                    if isinstance(val, list) and len(val) > 0:
                        str_vals = [str(v).lower() for v in val]
                        df = df[series.astype(str).str.lower().isin(str_vals)]
                elif operator == ">":
                    try:
                        df = df[pd.to_numeric(series, errors='coerce') > float(val)]
                    except Exception:
                        pass
                elif operator == "<":
                    try:
                        df = df[pd.to_numeric(series, errors='coerce') < float(val)]
                    except Exception:
                        pass
                elif operator == ">=":
                    try:
                        df = df[pd.to_numeric(series, errors='coerce') >= float(val)]
                    except Exception:
                        pass
                elif operator == "<=":
                    try:
                        df = df[pd.to_numeric(series, errors='coerce') <= float(val)]
                    except Exception:
                        pass
                elif operator == "is_null":
                    df = df[series.isna()]
                elif operator == "not_null":
                    df = df[series.notna()]

        total_filtered = len(df)

        # 4. Sorting
        if sort_by and sort_by in df.columns:
            # Sort with nulls at the end
            df = df.sort_values(by=sort_by, ascending=sort_asc, na_position='last')

        # 5. Pagination
        if page_size < 1:
            page_size = 25
        total_pages = max(1, (total_filtered + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        paginated_df = df.iloc[start_idx:end_idx]

        # Convert records to JSON-friendly dicts, including original index
        records = []
        for idx, row in paginated_df.iterrows():
            record = row.to_dict()
            # Clean NaNs and infs to None
            clean_record = {
                k: (None if pd.isna(v) else (int(v) if isinstance(v, (np.integer,)) else v))
                for k, v in record.items()
            }
            clean_record["_row_index"] = int(idx)
            records.append(clean_record)

        return {
            "total_filtered": total_filtered,
            "total_records": len(self.original_df),
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "columns": list(df.columns),
            "rows": records
        }

    def find_specific_value(self, target_value: str, column: Optional[str] = None, exact: bool = False) -> Dict[str, Any]:
        """Specific feature to scan for a raw value across a column or all columns."""
        df = self.original_df
        target_str = str(target_value).strip()

        matches = []
        if column and column in df.columns:
            search_cols = [column]
        else:
            search_cols = list(df.columns)

        for col in search_cols:
            series = df[col].astype(str)
            if exact:
                match_indices = df[series.str.lower() == target_str.lower()].index.tolist()
            else:
                match_indices = df[series.str.contains(target_str, case=False, na=False, regex=False)].index.tolist()

            for idx in match_indices:
                val = df.at[idx, col]
                matches.append({
                    "row_index": int(idx),
                    "column": col,
                    "matched_value": None if pd.isna(val) else str(val),
                    "row_preview": {
                        k: (None if pd.isna(v) else str(v))
                        for k, v in df.loc[idx].head(5).to_dict().items()
                    }
                })

        return {
            "target_value": target_value,
            "column": column or "ALL",
            "total_matches": len(matches),
            "matches": matches[:100]  # Cap preview at 100
        }

    def get_row_detail(self, row_index: int) -> Optional[Dict[str, Any]]:
        """Fetch complete key-value details for a specific row index."""
        if row_index not in self.original_df.index:
            return None
        row = self.original_df.loc[row_index]
        return {
            "row_index": int(row_index),
            "data": {
                k: (None if pd.isna(v) else (int(v) if isinstance(v, np.integer) else str(v)))
                for k, v in row.to_dict().items()
            }
        }

    def export_data(
        self,
        export_format: str = "csv",
        global_search: Optional[str] = None,
        column_filters: Optional[List[Dict[str, Any]]] = None,
        sort_by: Optional[str] = None,
        sort_asc: bool = True
    ) -> bytes:
        # Run query without pagination to get full filtered dataset
        query_res = self.query(
            global_search=global_search,
            column_filters=column_filters,
            sort_by=sort_by,
            sort_asc=sort_asc,
            page=1,
            page_size=len(self.original_df) + 10
        )
        # Reconstruct filtered dataframe
        df = self.original_df
        # We can directly filter df using the same logic
        if global_search and global_search.strip():
            term = global_search.strip()
            mask = pd.Series(False, index=df.index)
            for col in df.columns:
                mask |= df[col].astype(str).str.contains(term, case=False, na=False, regex=False)
            df = df[mask]

        if column_filters:
            for f in column_filters:
                col = f.get("column")
                operator = f.get("operator", "contains")
                val = f.get("value")
                if col not in df.columns or val is None or val == "":
                    continue
                series = df[col]
                if operator == "contains":
                    df = df[series.astype(str).str.contains(str(val), case=False, na=False, regex=False)]
                elif operator in ["exact", "equals"]:
                    df = df[series.astype(str).str.lower() == str(val).lower()]
                elif operator == "in" and isinstance(val, list):
                    df = df[series.astype(str).str.lower().isin([str(v).lower() for v in val])]

        if sort_by and sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=sort_asc)

        buf = io.BytesIO()
        if export_format == "excel":
            with pd.ExcelWriter(buf, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name="Filtered_Data")
        elif export_format == "json":
            buf.write(df.to_json(orient='records', indent=2).encode('utf-8'))
        else:  # csv
            df.to_csv(buf, index=False)

        buf.seek(0)
        return buf.getvalue()
