import io
from typing import List, Dict, Any
import pandas as pd
from loguru import logger

def export_incidents_to_excel(incidents_data: List[Dict[str, Any]]) -> bytes:
    """Modular Tool: Export list of incidents into Excel binary stream using Pandas & OpenPyXL."""
    try:
        df = pd.DataFrame(incidents_data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Incidents")
        buffer.seek(0)
        logger.info(f"Successfully generated Excel spreadsheet for {len(incidents_data)} incidents")
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Failed to export incidents to Excel: {e}")
        raise e
