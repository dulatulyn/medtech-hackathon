"""Admin endpoints: archive import and document status."""
from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, UploadFile, status

from src.api.exceptions.exception_handlers import handle_service_errors
from src.core.logging import get_logger
from src.services.import_service import ImportService

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", route_class=DishkaRoute, tags=["Admin"])


@router.post("/imports", status_code=status.HTTP_201_CREATED)
@handle_service_errors
async def import_archive(file: UploadFile, service: FromDishka[ImportService]):
    """Upload a ZIP archive of price lists and create pending documents."""
    data = await file.read()
    doc_ids = await service.import_archive(data)
    logger.info("archive_imported", file_name=file.filename, documents=len(doc_ids))
    return {"documents": len(doc_ids), "doc_ids": doc_ids}


@router.get("/documents")
@handle_service_errors
async def list_documents(service: FromDishka[ImportService]):
    """List all price documents and their parse status."""
    docs = await service.list_documents()
    return {"documents": [d.__dict__ for d in docs]}
