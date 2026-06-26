"""Validation service: price checks, versioning, and anomaly detection."""
from __future__ import annotations

from src.core.logging import get_logger
from src.dtos.validation_dto import ValidationResultDTO
from src.repositories.price_repository import PriceRepository

logger = get_logger(__name__)


class ValidationService:
    """Validates parsed price items: checks, versioning, anomaly detection."""

    def __init__(self, prices: PriceRepository):
        self.prices = prices

    async def validate_document(self, doc_id: str) -> ValidationResultDTO:
        """Validate all items in a document; build history; flag anomalies."""
        items = await self.prices.list_items_for_doc(doc_id)
        checked = anomalies = archived = errors = 0
        warnings: list[str] = []

        for item in items:
            # Skip unmatched items
            if not item.service_id:
                continue

            checked += 1

            # Basic tariff amount checks
            for tariff in item.tariffs:
                if tariff.amount <= 0:
                    warnings.append(f"item {item.id}: {tariff.tariff_type} amount ≤ 0")
                    errors += 1

            # Get previously active items for the same partner + service
            prev_items = await self.prices.list_active_items_for_partner_service(
                item.partner_id, item.service_id
            )
            # Exclude the current item from the result set
            prev_items = [p for p in prev_items if p.id != item.id]

            for prev in prev_items:
                # Archive the old item and point it at the new one
                await self.prices.deactivate_item(prev.id, item.id)
                archived += 1

                # Anomaly detection: flag price changes greater than 50 %
                prev_amounts = {t.tariff_type: t.amount for t in prev.tariffs}
                for tariff in item.tariffs:
                    old_amount = prev_amounts.get(tariff.tariff_type)
                    if old_amount and old_amount > 0:
                        change = abs(float(tariff.amount) - float(old_amount)) / float(old_amount)
                        if change > 0.5:
                            reason = (
                                f"{tariff.tariff_type}: {old_amount}→{tariff.amount}"
                                f" ({change:.0%})"
                            )
                            await self.prices.set_anomaly(item.id, reason)
                            anomalies += 1
                            warnings.append(f"anomaly item {item.id}: {reason}")

        logger.info(
            "validation_done",
            doc_id=doc_id,
            checked=checked,
            anomalies=anomalies,
            archived=archived,
        )
        return ValidationResultDTO(
            doc_id=doc_id,
            checked=checked,
            anomalies=anomalies,
            archived=archived,
            errors=errors,
            warnings=warnings,
        )
