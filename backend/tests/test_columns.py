"""Header detection and tariff classification tests."""
from src.enums import TariffType
from src.parsers.columns import classify_tariff, find_header_row, map_columns


def test_classify_tariff():
    assert classify_tariff("Цена для граждан Республики Казахстан") == TariffType.resident
    assert classify_tariff("Цена для граждан стран СНГ") == TariffType.cis
    assert classify_tariff("Цена для граждан стран дальнего зарубежья") == TariffType.far_abroad
    assert classify_tariff("Цены для страховых компаний") == TariffType.insurance
    assert classify_tariff("Цена без учета НДС") == TariffType.no_vat
    assert classify_tariff("Цена со партнера") == TariffType.partner
    assert classify_tariff("Стоимость, тенге") == TariffType.default


def test_map_columns_multi_price():
    header = ["№", "Наименование услуг", "Код", "Ед. измерения",
              "Цена для граждан Республики Казахстан", "Цена для граждан стран СНГ",
              "Цена для граждан стран дальнего зарубежья"]
    cmap = map_columns(header)
    assert cmap.name == 1
    assert cmap.code == 2
    assert cmap.unit == 3
    assert [t for _, t in cmap.prices] == [TariffType.resident, TariffType.cis, TariffType.far_abroad]
    assert cmap.is_usable()


def test_find_header_row_skips_title_block():
    grid = [
        ["ПРЕЙСКУРАНТ", None, None],
        ["к приказу №...", None, None],
        ["№", "Наименование услуги", "Цена, тенге"],
        ["1", "Прием врача", "16600"],
    ]
    assert find_header_row(grid) == 2
