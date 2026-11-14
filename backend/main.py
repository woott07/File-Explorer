import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.parser import DocumentParser
from backend.query_engine import QueryEngine

# Production Configuration
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "100"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in CORS_ORIGINS_ENV.split(",") if o.strip()]

app = FastAPI(
    title="DocuScan & Inspector API",
    description="High-speed tabular document scanner, row/column locator, and data inspector",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document session store
session_state: Dict[str, Any] = {
    "parser": DocumentParser(),
    "query_engine": None,
    "has_document": False
}


class ColumnFilter(BaseModel):
    column: str
    operator: str = "contains"
    value: Any = None


class QueryRequest(BaseModel):
    global_search: Optional[str] = None
    column_filters: Optional[List[ColumnFilter]] = None
    sort_by: Optional[str] = None
    sort_asc: bool = True
    page: int = 1
    page_size: int = 25
    target_columns: Optional[List[str]] = None


class FindValueRequest(BaseModel):
    target_value: str
    column: Optional[str] = None
    exact: bool = False


class SheetSwitchRequest(BaseModel):
    sheet_name: str


class ExportRequest(BaseModel):
    export_format: str = "csv"
    global_search: Optional[str] = None
    column_filters: Optional[List[ColumnFilter]] = None
    sort_by: Optional[str] = None
    sort_asc: bool = True


@app.get("/api/health")
async def health_check():
    """Production health check probe."""
    return {
        "status": "healthy",
        "service": "DocuScan",
        "version": "1.0.0",
        "has_active_document": session_state["has_document"]
    }


@app.post("/api/reset")
async def reset_document():
    """Clear active document from memory."""
    session_state["parser"] = DocumentParser()
    session_state["query_engine"] = None
    session_state["has_document"] = False
    return {"status": "success", "message": "Document session cleared"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse an Excel, CSV, TSV, or JSON document."""
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB."
        )

    parser: DocumentParser = session_state["parser"]
    try:
        profile = parser.load_bytes(content, file.filename)
        session_state["query_engine"] = QueryEngine(parser.current_df)
        session_state["has_document"] = True
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scan document: {str(e)}")


@app.post("/api/switch-sheet")
async def switch_sheet(req: SheetSwitchRequest):
    """Switch active sheet in a multi-sheet Excel workbook."""
    if not session_state["has_document"]:
        raise HTTPException(status_code=400, detail="No document currently loaded.")

    parser: DocumentParser = session_state["parser"]
    try:
        profile = parser.switch_sheet(req.sheet_name)
        session_state["query_engine"] = QueryEngine(parser.current_df)
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/profile")
async def get_profile():
    """Fetch schema, columns metadata, and health overview of current document."""
    if not session_state["has_document"]:
        return {"has_document": False}
    parser: DocumentParser = session_state["parser"]
    profile = parser.get_profile()
    return {"has_document": True, "profile": profile}


@app.post("/api/query")
async def query_data(req: QueryRequest):
    """Query, search, filter, and paginate through records."""
    if not session_state["has_document"] or session_state["query_engine"] is None:
        raise HTTPException(status_code=400, detail="No document loaded. Please upload a file first.")

    qe: QueryEngine = session_state["query_engine"]
    filters_dict = [f.model_dump() for f in req.column_filters] if req.column_filters else []
    
    result = qe.query(
        global_search=req.global_search,
        column_filters=filters_dict,
        sort_by=req.sort_by,
        sort_asc=req.sort_asc,
        page=req.page,
        page_size=req.page_size,
        target_columns=req.target_columns
    )
    return result


@app.post("/api/find-value")
async def find_value(req: FindValueRequest):
    """Locate specific raw values across a column or all columns."""
    if not session_state["has_document"] or session_state["query_engine"] is None:
        raise HTTPException(status_code=400, detail="No document loaded. Please upload a file first.")

    qe: QueryEngine = session_state["query_engine"]
    result = qe.find_specific_value(
        target_value=req.target_value,
        column=req.column,
        exact=req.exact
    )
    return result


@app.get("/api/row/{row_index}")
async def get_row(row_index: int):
    """Retrieve full record details by row index for inspector drawer."""
    if not session_state["has_document"] or session_state["query_engine"] is None:
        raise HTTPException(status_code=400, detail="No document loaded.")

    qe: QueryEngine = session_state["query_engine"]
    row_info = qe.get_row_detail(row_index)
    if not row_info:
        raise HTTPException(status_code=404, detail=f"Row index {row_index} not found.")
    return row_info


@app.post("/api/export")
async def export_data(req: ExportRequest):
    """Export filtered subset to CSV, Excel, or JSON."""
    if not session_state["has_document"] or session_state["query_engine"] is None:
        raise HTTPException(status_code=400, detail="No document loaded.")

    qe: QueryEngine = session_state["query_engine"]
    filters_dict = [f.model_dump() for f in req.column_filters] if req.column_filters else []
    
    file_bytes = qe.export_data(
        export_format=req.export_format,
        global_search=req.global_search,
        column_filters=filters_dict,
        sort_by=req.sort_by,
        sort_asc=req.sort_asc
    )

    media_types = {
        "csv": "text/csv",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json": "application/json"
    }
    media_type = media_types.get(req.export_format, "text/csv")
    ext = "xlsx" if req.export_format == "excel" else req.export_format
    filename = f"exported_data.{ext}"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Serve frontend static assets
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    async def serve_index():
        with open(os.path.join(static_dir, "index.html"), "r") as f:
            return HTMLResponse(content=f.read())
