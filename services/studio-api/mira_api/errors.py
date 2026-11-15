from __future__ import annotations

from fastapi import HTTPException
from fastapi.responses import JSONResponse


MESSAGES = {
    "SampleImportFailed": "Не удалось импортировать файл. Выберите WAV или FLAC и повторите.",
    "SampleFormatUnsupported": "Формат не поддерживается. Выберите WAV или FLAC.",
    "DatasetNotFound": "Датасет не найден.",
    "SampleNotFound": "Семпл не найден.",
    "SegmentationFailed": "Нарезка не завершилась. Проверьте семпл и запустите снова.",
    "SegmentInvalidRange": "Границы сегмента неверны. startMs должен быть меньше endMs.",
    "NoAcceptedSegments": "Нет принятых сегментов для обучения. Примите сегменты на экране Нарезка.",
    "TrainingFailed": "Обучение не завершилось. Откройте лог и запустите снова.",
    "ModelNotFound": "Модель не найдена.",
    "ModelNotReady": "Модель ещё не готова.",
    "ModelImportFailed": "Пакет модели не открылся. Выберите файл Mira Model Package.",
    "ScriptTextEmpty": "Нет текста для озвучки. Введите или сгенерируйте текст.",
    "LlmFailed": "LLM не вернул текст. Проверьте связь с моделью и повторите.",
    "TtsFailed": "Озвучка не собралась. Выберите модель и повторите.",
    "ApiAuthFailed": "Запрос без доступа отклонён. Проверьте токен в настройках API.",
    "PortInUse": "Порт занят. Выберите другой порт и запустите снова.",
    "JobConflict": "Уже выполняется задача этого типа. Дождитесь завершения.",
}


def raise_error(code: str, field: str | None = None, status: int = 422) -> None:
    raise HTTPException(
        status_code=status,
        detail={"code": code, "field": field, "message": MESSAGES.get(code, code)},
    )


def error_response(exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": detail},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HttpError", "field": None, "message": str(detail)}},
    )
