using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Фабрика OCR-сервісів. Маршрутизує запит на MistralOcrService або OpenRouterOcrService
/// залежно від поля Provider у вибраній OcrModelConfig з БД.
/// </summary>
public interface IOcrServiceFactory
{
    /// <summary>
    /// Повертає IOcrService та ідентифікатор моделі для використання.
    /// Якщо modelIdentifier == null, використовується IsDefault модель з БД.
    /// </summary>
    Task<(IOcrService Service, string ModelId)> ResolveAsync(
        string? modelIdentifier,
        CancellationToken ct);
}
