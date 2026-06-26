"""Admin endpoints: archive import, document pipeline control, and stats."""
from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, UploadFile, status

from src.api.exceptions.exception_handlers import handle_service_errors
from src.core.logging import get_logger
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.import_service import ImportService
from src.services.normalization_service import NormalizationService
from src.services.parse_service import ParseService
from src.services.validation_service import ValidationService

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
    return {
        "documents": [
            {
                "id": d.id,
                "partner_id": d.partner_id,
                "file_name": d.file_name,
                "file_format": d.file_format.value,
                "parse_status": d.parse_status.value,
                "effective_date": str(d.effective_date) if d.effective_date else None,
                "parse_log": d.parse_log,
                "created_at": str(d.created_at),
            }
            for d in docs
        ]
    }


@router.post("/documents/{doc_id}/parse")
@handle_service_errors
async def parse_document(doc_id: str, service: FromDishka[ParseService]):
    """Trigger parsing for a single document by ID."""
    row_count = await service.parse_document(doc_id)
    return {"doc_id": doc_id, "rows": row_count}


@router.post("/documents/{doc_id}/normalize")
@handle_service_errors
async def normalize_document(doc_id: str, service: FromDishka[NormalizationService]):
    """Run the normalization cascade on all unmatched items in a document."""
    result = await service.normalize_document(doc_id)
    return {
        "doc_id": result.doc_id,
        "matched": result.matched,
        "unmatched": result.unmatched,
        "auto_matched": result.auto_matched,
        "needs_review": result.needs_review,
    }


@router.post("/documents/{doc_id}/validate")
@handle_service_errors
async def validate_document(doc_id: str, service: FromDishka[ValidationService]):
    """Run validation, price history versioning, and anomaly detection on a document."""
    result = await service.validate_document(doc_id)
    return {
        "doc_id": result.doc_id,
        "checked": result.checked,
        "anomalies": result.anomalies,
        "archived": result.archived,
        "errors": result.errors,
        "warnings": result.warnings[:50],
    }


@router.post("/parse-all")
@handle_service_errors
async def parse_all_pending(service: FromDishka[ParseService]):
    """Parse all pending documents."""
    counts = await service.parse_pending()
    return {"processed": len(counts), "results": counts}


@router.get("/stats")
@handle_service_errors
async def get_stats(
    price_repo: FromDishka[PriceRepository],
    catalog_repo: FromDishka[CatalogRepository],
    partner_repo: FromDishka[PartnerRepository],
):
    """Return live quality and coverage statistics for the import pipeline."""
    docs_by_status = await price_repo.count_by_status()
    total_docs = sum(docs_by_status.values())
    total_items = await price_repo.count_total_items()
    unmatched = await price_repo.count_unmatched()
    anomalies = await price_repo.count_anomalies()
    match_stats = await price_repo.get_match_stats()
    services_count = await catalog_repo.count_services()
    partners_active = await partner_repo.count_active()

    matched = total_items - unmatched
    match_rate = round(matched / total_items * 100, 1) if total_items > 0 else 0.0

    return {
        "total_documents": total_docs,
        "documents_by_status": docs_by_status,
        "total_items": total_items,
        "items_matched": matched,
        "items_unmatched": unmatched,
        "match_rate_pct": match_rate,
        "anomalies": anomalies,
        "items_by_method": match_stats,
        "partners_active": partners_active,
        "services_count": services_count,
    }
